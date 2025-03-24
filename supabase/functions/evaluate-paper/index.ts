
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log the API Key being used (masked)
    const apiKey = Deno.env.get('OPENAI_API_KEY') || '';
    console.log("Using API Key: " + apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 4));
    
    const { questionPaper, answerKey, studentAnswer, studentInfo, testId } = await req.json();

    console.log("Received evaluation request for student:", studentInfo?.name);
    console.log("Student answer type:", studentAnswer?.url ? "URL provided" : "Text provided");
    console.log("ZIP URL available:", studentAnswer?.zip_url ? "Yes" : "No");
    console.log("Test ID for evaluation:", testId);
    
    // Add cache-busting parameter to URLs to prevent caching issues
    const addCacheBuster = (url: string) => {
      const cacheBuster = `cache=${Date.now()}`;
      return url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;
    };
    
    // Apply cache busting to all URLs
    if (questionPaper?.url) questionPaper.url = addCacheBuster(questionPaper.url);
    if (answerKey?.url) answerKey.url = addCacheBuster(answerKey.url);
    if (studentAnswer?.url) studentAnswer.url = addCacheBuster(studentAnswer.url);
    if (studentAnswer?.zip_url) studentAnswer.zip_url = addCacheBuster(studentAnswer.zip_url);
    
    // Process the student answer if it's a PDF or image
    let processedStudentAnswer = studentAnswer;
    let extractedStudentText = null;
    
    if (studentAnswer?.zip_url) {
      console.log("Found ZIP URL for enhanced OCR processing:", studentAnswer.zip_url);
      
      try {
        // Fetch the ZIP file with a longer timeout (30 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const zipResponse = await fetch(studentAnswer.zip_url, { 
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache' }
        });
        clearTimeout(timeoutId);
        
        if (!zipResponse.ok) {
          console.error("Failed to fetch ZIP file:", zipResponse.statusText);
          throw new Error("Failed to fetch ZIP file: " + zipResponse.statusText);
        }
        
        const zipData = await zipResponse.arrayBuffer();
        console.log("Successfully downloaded ZIP file, size:", zipData.byteLength);
        
        // Extract PNG files from ZIP
        const zip = await JSZip.loadAsync(zipData);
        const imagePromises = [];
        const imageFiles = [];
        
        // Process each file in the ZIP
        zip.forEach((relativePath, zipEntry) => {
          if (!zipEntry.dir && (relativePath.endsWith('.png') || relativePath.endsWith('.jpg'))) {
            const promise = zipEntry.async('base64').then(base64Data => {
              const imgFormat = relativePath.endsWith('.png') ? 'png' : 'jpeg';
              imageFiles.push({
                name: relativePath,
                dataUrl: `data:image/${imgFormat};base64,${base64Data}`
              });
            });
            imagePromises.push(promise);
          }
        });
        
        await Promise.all(imagePromises);
        
        // Sort images by filename (ensures page order)
        imageFiles.sort((a, b) => a.name.localeCompare(b.name));
        
        console.log(`Successfully extracted ${imageFiles.length} images from ZIP`);
        
        if (imageFiles.length > 0) {
          // Use GPT-4o's vision capabilities for OCR on all pages
          console.log("Performing OCR with GPT-4o on extracted images...");
          
          const messages = [
            { 
              role: 'system', 
              content: `You are an OCR expert specialized in extracting text from handwritten answer sheets and documents.
              
              For each question in the document:
              1. Identify the question number clearly.
              2. Extract the complete answer text.
              3. Format each answer on a new line starting with "Q<number>:" followed by the answer.
              4. If the handwriting is difficult to read, make your best effort and indicate uncertainty with [?].
              5. Maintain the structure of mathematical equations, diagrams descriptions, and any special formatting.
              6. If you identify multiple pages, process each and maintain continuity between questions.
              
              Your response should be structured, accurate, and preserve the original content's organization.`
            }
          ];
          
          // Create user message with text and images
          const userContent = [
            { 
              type: 'text', 
              text: `This is a student's answer sheet for test ID: ${testId}. Extract all the text from these ${imageFiles.length} pages, focusing on identifying question numbers and their corresponding answers:` 
            }
          ];
          
          // Add each image to the request (up to 20 images)
          const maxImages = Math.min(imageFiles.length, 20);
          for (let i = 0; i < maxImages; i++) {
            userContent.push({ 
              type: 'image_url', 
              image_url: { 
                url: imageFiles[i].dataUrl,
                detail: "high" 
              } 
            });
          }
          
          messages.push({ role: 'user', content: userContent });
          
          // Increase timeout for OpenAI API call (120 seconds)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 120000);
          
          const ocrResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: messages,
              temperature: 0.2,
              max_tokens: 4000,
            }),
          });
          
          clearTimeout(timeoutId);

          if (!ocrResponse.ok) {
            const errorText = await ocrResponse.text();
            console.error("OpenAI OCR error:", errorText);
            
            // Create a placeholder text if OCR fails
            processedStudentAnswer = {
              ...studentAnswer,
              text: "Unable to extract text from document. Please try with a clearer image or document.",
              isOcrProcessed: false,
              ocrError: errorText
            };
            extractedStudentText = "OCR extraction failed: " + errorText;
          } else {
            const ocrResult = await ocrResponse.json();
            const extractedOcrText = ocrResult.choices[0]?.message?.content;
            
            console.log("OCR extraction successful, extracted text length:", extractedOcrText?.length || 0);
            console.log("Sample extracted text:", extractedOcrText?.substring(0, 100) + "...");
            
            // Store the extracted text for updating in the database
            extractedStudentText = extractedOcrText;
            
            // Update the student answer with OCR text
            processedStudentAnswer = {
              ...studentAnswer,
              text: extractedOcrText,
              isOcrProcessed: true,
              testId: testId,
              zipProcessed: true
            };
          }
        } else {
          console.error("No image files found in ZIP");
          extractedStudentText = "No image files found in ZIP for OCR processing";
        }
      } catch (zipError) {
        console.error("Error processing ZIP file:", zipError);
        extractedStudentText = "Error processing ZIP file: " + zipError.message;
      }
    } else if (studentAnswer?.url && (
        studentAnswer.url.includes('.jpg') || 
        studentAnswer.url.includes('.jpeg') || 
        studentAnswer.url.includes('.png') ||
        studentAnswer.url.includes('.pdf')
    )) {
      console.log("Detected document/image answer sheet, performing OCR with GPT-4o...");
      console.log("URL:", studentAnswer.url);
      
      try {
        // For PDFs, we'll recommend using the ZIP processing path instead
        if (studentAnswer.url.includes('.pdf')) {
          console.log("PDF detected. For better results, please use ZIP processing path.");
          extractedStudentText = "PDF detected. For better results, please regenerate the assessment to use enhanced OCR via ZIP processing.";
          processedStudentAnswer = {
            ...studentAnswer,
            text: extractedStudentText,
            isOcrProcessed: false
          };
        } else {
          // For direct image processing (JPEG, PNG)
          // Use GPT-4o's vision capabilities for OCR with extended timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000);
          
          const ocrResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                { 
                  role: 'system', 
                  content: `You are an OCR expert specialized in extracting text from handwritten answer sheets and documents.
                  
                  For each question in the document:
                  1. Identify the question number clearly.
                  2. Extract the complete answer text.
                  3. Format each answer on a new line starting with "Q<number>:" followed by the answer.
                  4. If the handwriting is difficult to read, make your best effort and indicate uncertainty with [?].
                  5. Maintain the structure of mathematical equations, diagrams descriptions, and any special formatting.
                  6. If you identify multiple pages, process each and maintain continuity between questions.
                  
                  Your response should be structured, accurate, and preserve the original content's organization.`
                },
                { 
                  role: 'user', 
                  content: [
                    { 
                      type: 'text', 
                      text: `This is a student's answer sheet for test ID: ${testId}. Extract all the text, focusing on identifying question numbers and their corresponding answers:` 
                    },
                    { 
                      type: 'image_url', 
                      image_url: { 
                        url: studentAnswer.url,
                        detail: "high" 
                      } 
                    }
                  ] 
                }
              ],
              temperature: 0.2,
              max_tokens: 4000,
            }),
          });
          
          clearTimeout(timeoutId);

          if (!ocrResponse.ok) {
            const errorText = await ocrResponse.text();
            console.error("OpenAI OCR error:", errorText);
            
            // Create a placeholder text if OCR fails
            processedStudentAnswer = {
              ...studentAnswer,
              text: "Unable to extract text from document. Please try with a clearer image or document.",
              isOcrProcessed: false,
              ocrError: errorText
            };
            extractedStudentText = "OCR extraction failed: " + errorText;
          } else {
            const ocrResult = await ocrResponse.json();
            const extractedOcrText = ocrResult.choices[0]?.message?.content;
            
            console.log("OCR extraction successful, extracted text length:", extractedOcrText?.length || 0);
            console.log("Sample extracted text:", extractedOcrText?.substring(0, 100) + "...");
            
            // Store the extracted text for updating in the database
            extractedStudentText = extractedOcrText;
            
            // Update the student answer with OCR text
            processedStudentAnswer = {
              ...studentAnswer,
              text: extractedOcrText,
              isOcrProcessed: true,
              testId: testId
            };
          }
        }
      } catch (ocrError) {
        console.error("Error during OCR processing:", ocrError);
        
        // Create a placeholder text if OCR fails
        processedStudentAnswer = {
          ...studentAnswer,
          text: "Error processing document. Technical details: " + ocrError.message,
          isOcrProcessed: false,
          ocrError: ocrError.message
        };
      }
    }
    
    // Process question paper and answer key documents to extract text
    let processedQuestionPaper = questionPaper;
    let extractedQuestionText = null;
    
    // Extract text from question paper
    if (questionPaper?.url && (
        questionPaper.url.includes('.pdf') ||
        questionPaper.url.includes('.jpg') || 
        questionPaper.url.includes('.jpeg') || 
        questionPaper.url.includes('.png')
    )) {
      console.log("Processing question paper for text extraction:", questionPaper.url);
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        
        const ocrResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { 
                role: 'system', 
                content: `You are an OCR expert specialized in extracting text from question papers.
                
                For each question in the document:
                1. Identify the question number clearly.
                2. Extract the complete question text along with any subparts.
                3. Format each question on a new line starting with "Q<number>:" followed by the question.
                4. Preserve the structure of mathematical equations, diagrams descriptions, and any special formatting.
                5. Include all instructions, marks allocations, and other relevant information.
                
                Your response should be structured, accurate, and preserve the original content's organization.`
              },
              { 
                role: 'user', 
                content: [
                  { 
                    type: 'text', 
                    text: `This is a question paper for test ID: ${testId}. Extract all the text, focusing on identifying question numbers and their content:` 
                  },
                  { 
                    type: 'image_url', 
                    image_url: { 
                      url: questionPaper.url,
                      detail: "high" 
                    } 
                  }
                ] 
              }
            ],
            temperature: 0.2,
            max_tokens: 4000,
          }),
        });
        
        clearTimeout(timeoutId);

        if (!ocrResponse.ok) {
          const errorText = await ocrResponse.text();
          console.error("OpenAI OCR error for question paper:", errorText);
          
          processedQuestionPaper = {
            ...questionPaper,
            text: "Unable to extract text from question paper.",
            isOcrProcessed: false,
            ocrError: errorText
          };
        } else {
          const ocrResult = await ocrResponse.json();
          const extractedOcrText = ocrResult.choices[0]?.message?.content;
          
          console.log("Question paper OCR successful, extracted text length:", extractedOcrText?.length || 0);
          console.log("Sample question paper text:", extractedOcrText?.substring(0, 100) + "...");
          
          extractedQuestionText = extractedOcrText;
          
          processedQuestionPaper = {
            ...questionPaper,
            text: extractedOcrText,
            isOcrProcessed: true
          };
        }
      } catch (ocrError) {
        console.error("Error during question paper OCR processing:", ocrError);
        
        processedQuestionPaper = {
          ...questionPaper,
          text: "Error processing question paper document.",
          isOcrProcessed: false,
          ocrError: ocrError.message
        };
      }
    }
    
    // Process answer key to extract text
    let processedAnswerKey = answerKey;
    let extractedAnswerKeyText = null;
    
    if (answerKey?.url && (
        answerKey.url.includes('.pdf') ||
        answerKey.url.includes('.jpg') || 
        answerKey.url.includes('.jpeg') || 
        answerKey.url.includes('.png')
    )) {
      console.log("Processing answer key for text extraction:", answerKey.url);
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        
        const ocrResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { 
                role: 'system', 
                content: `You are an OCR expert specialized in extracting text from answer keys.
                
                For each answer in the document:
                1. Identify the question number clearly.
                2. Extract the complete answer text along with any marking guidelines.
                3. Format each answer on a new line starting with "Q<number>:" followed by the answer.
                4. Preserve the structure of mathematical equations, diagrams, and any special formatting.
                5. Include all marking schemes, points allocation, and other evaluation criteria.
                
                Your response should be structured, accurate, and preserve the original content's organization.`
              },
              { 
                role: 'user', 
                content: [
                  { 
                    type: 'text', 
                    text: `This is an answer key for test ID: ${testId}. Extract all the text, focusing on identifying question numbers and their corresponding answers:` 
                  },
                  { 
                    type: 'image_url', 
                    image_url: { 
                      url: answerKey.url,
                      detail: "high" 
                    } 
                  }
                ] 
              }
            ],
            temperature: 0.2,
            max_tokens: 4000,
          }),
        });
        
        clearTimeout(timeoutId);

        if (!ocrResponse.ok) {
          const errorText = await ocrResponse.text();
          console.error("OpenAI OCR error for answer key:", errorText);
          
          processedAnswerKey = {
            ...answerKey,
            text: "Unable to extract text from answer key.",
            isOcrProcessed: false,
            ocrError: errorText
          };
        } else {
          const ocrResult = await ocrResponse.json();
          const extractedOcrText = ocrResult.choices[0]?.message?.content;
          
          console.log("Answer key OCR successful, extracted text length:", extractedOcrText?.length || 0);
          console.log("Sample answer key text:", extractedOcrText?.substring(0, 100) + "...");
          
          extractedAnswerKeyText = extractedOcrText;
          
          processedAnswerKey = {
            ...answerKey,
            text: extractedOcrText,
            isOcrProcessed: true
          };
        }
      } catch (ocrError) {
        console.error("Error during answer key OCR processing:", ocrError);
        
        processedAnswerKey = {
          ...answerKey,
          text: "Error processing answer key document.",
          isOcrProcessed: false,
          ocrError: ocrError.message
        };
      }
    }
    
    // Update the assessment record with the extracted text
    if (extractedStudentText && studentInfo?.id) {
      try {
        // Create Supabase client
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') || '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
          { auth: { persistSession: false } }
        );
        
        // Find and update the assessment with the extracted text
        const { error } = await supabaseClient
          .from('test_answers')
          .update({ text_content: extractedStudentText })
          .eq('student_id', studentInfo.id)
          .eq('test_id', testId);
          
        if (error) {
          console.error("Error updating test_answers with extracted text:", error);
        } else {
          console.log("Successfully updated test_answers with extracted text");
        }
      } catch (dbError) {
        console.error("Error connecting to database:", dbError);
      }
    }
    
    // Prepare the prompt for OpenAI evaluation
    const systemPrompt = `
You are an AI evaluator responsible for grading a student's answer sheet for test ID: ${testId}.
The user will provide you with the question paper, answer key, and the student's answer sheet.
Follow these steps:

1. Analyze the question paper text to understand the questions and their marks allocation.
2. Analyze the answer key text to understand the correct answers and valuation criteria.
3. Extract questions and answers from the student's submission, matching questions by number where possible.
4. For each question:
   - Identify the question number
   - Compare the student's answer with the answer key
   - Assign appropriate marks based on correctness and completeness
   - Provide brief remarks explaining the score

5. Be generous in your assessment but objective. Award 0 marks for completely incorrect or unattempted answers.
6. Ensure you only evaluate answers for THIS specific test (ID: ${testId}).

Your evaluation must be returned in a structured JSON format.
`;

    const userPrompt = `
Question Paper for Test ID ${testId}:
${JSON.stringify(processedQuestionPaper)}

Answer Key for Test ID ${testId}:
${JSON.stringify(processedAnswerKey)}

Student Answer Sheet for Test ID ${testId}:
${JSON.stringify(processedStudentAnswer)}

Student Info:
${JSON.stringify(studentInfo)}

Provide the response in a JSON format that contains:

student_name: "${studentInfo?.name || 'Unknown'}"
roll_no: "${studentInfo?.roll_number || 'Unknown'}"
class: "${studentInfo?.class || 'Unknown'}"
subject: "${studentInfo?.subject || 'Unknown'}"
test_id: "${testId || 'Unknown'}"

answers: an array of objects containing the following fields:
- question_no: the question number
- question: the question content
- answer: the student's answer
- score: an array containing [assigned_score, total_score]
- remarks: any remarks or comments regarding the answer
- confidence: a number between 0 and 1 indicating confidence in the grading

Return ONLY the JSON object without any additional text or markdown formatting.
`;

    console.log("Sending request to OpenAI for evaluation");
    
    // Make request to OpenAI with the correct API key format and extended timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    });
    
    clearTimeout(timeoutId);

    if (!openAIResponse.ok) {
      const errorBody = await openAIResponse.text();
      console.error("OpenAI API error:", errorBody);
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${errorBody}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await openAIResponse.json();
    console.log("Received response from OpenAI");
    
    if (!aiResponse.choices || !aiResponse.choices[0]?.message?.content) {
      console.error("Invalid response format from OpenAI:", JSON.stringify(aiResponse));
      return new Response(
        JSON.stringify({ error: 'Invalid response from OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the evaluation results
    const evaluationText = aiResponse.choices[0].message.content;
    console.log("Evaluation content received:", evaluationText.substring(0, 200) + "...");
    
    try {
      // Validate and clean up the evaluation data
      const evaluation = JSON.parse(evaluationText);
      
      // Calculate total score
      let totalAssignedScore = 0;
      let totalPossibleScore = 0;
      
      if (evaluation.answers && Array.isArray(evaluation.answers)) {
        evaluation.answers.forEach(answer => {
          if (Array.isArray(answer.score) && answer.score.length === 2) {
            totalAssignedScore += Number(answer.score[0]);
            totalPossibleScore += Number(answer.score[1]);
          }
        });
      }
      
      // Add summary information
      evaluation.summary = {
        totalScore: [totalAssignedScore, totalPossibleScore],
        percentage: totalPossibleScore > 0 ? Math.round((totalAssignedScore / totalPossibleScore) * 100) : 0
      };
      
      // Add metadata to ensure proper syncing
      evaluation.test_id = testId;
      evaluation.answer_sheet_url = studentAnswer.url;
      
      // Add the extracted texts if available
      if (extractedStudentText) {
        evaluation.text = extractedStudentText;
        evaluation.isOcrProcessed = true;
        if (studentAnswer?.zip_url) {
          evaluation.zipProcessed = true;
          evaluation.zip_url = studentAnswer.zip_url;
        }
      }
      
      if (extractedQuestionText) {
        evaluation.questionPaperText = extractedQuestionText;
      }
      
      if (extractedAnswerKeyText) {
        evaluation.answerKeyText = extractedAnswerKeyText;
      }
      
      console.log(`Evaluation completed: ${totalAssignedScore}/${totalPossibleScore} (${evaluation.summary.percentage}%)`);
      
      return new Response(
        JSON.stringify(evaluation),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error("Error parsing evaluation results:", parseError, evaluationText);
      return new Response(
        JSON.stringify({ error: `Failed to parse evaluation results: ${parseError.message}`, raw: evaluationText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in evaluate-paper function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Add import for Supabase client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
