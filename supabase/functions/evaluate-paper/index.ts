
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
    let extractedQuestionText = null;
    let extractedAnswerKeyText = null;
    
    // Function to extract text from document using GPT-4o vision
    const extractTextFromDocument = async (url, documentType) => {
      if (!url) return null;
      
      try {
        console.log(`Performing OCR with GPT-4o on ${documentType} document...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
                content: `You are an OCR expert specialized in extracting text from ${documentType} documents.
                
                Extract all text from the document:
                1. Preserve the original formatting and structure as much as possible.
                2. For questions, identify question numbers clearly.
                3. For answer keys, make sure to extract the correct answers with their question numbers.
                4. For handwritten answers, do your best to read the handwriting and indicate uncertainty with [?].
                
                Your response should be structured, accurate, and preserve the original content's organization.`
              },
              { 
                role: 'user', 
                content: [
                  { 
                    type: 'text', 
                    text: `This is a ${documentType} for test ID: ${testId}. Extract all the text, preserving the structure and organization:` 
                  },
                  { 
                    type: 'image_url', 
                    image_url: { 
                      url: url,
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

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`OpenAI OCR error for ${documentType}:`, errorText);
          return `OCR extraction failed for ${documentType}: ${errorText}`;
        }
        
        const result = await response.json();
        const extractedText = result.choices[0]?.message?.content;
        
        console.log(`OCR extraction successful for ${documentType}, extracted text length:`, extractedText?.length || 0);
        console.log(`Sample extracted text for ${documentType}:`, extractedText?.substring(0, 100) + "...");
        
        return extractedText;
      } catch (error) {
        console.error(`Error during OCR processing for ${documentType}:`, error);
        return `Error processing ${documentType}. Technical details: ${error.message}`;
      }
    };
    
    // Process student answer from ZIP file (enhanced OCR)
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
              testId: testId, // Include test ID to ensure answers are synced with the correct test
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
      // Extract text from student answer sheet (direct image or PDF)
      extractedStudentText = await extractTextFromDocument(studentAnswer.url, "student answer sheet");
      processedStudentAnswer = {
        ...studentAnswer,
        text: extractedStudentText,
        isOcrProcessed: true
      };
    }
    
    // Extract text from question paper and answer key
    if (questionPaper?.url) {
      extractedQuestionText = await extractTextFromDocument(questionPaper.url, "question paper");
    }
    
    if (answerKey?.url) {
      extractedAnswerKeyText = await extractTextFromDocument(answerKey.url, "answer key");
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
          .from('assessments')
          .update({ text_content: extractedStudentText })
          .eq('student_id', studentInfo.id)
          .eq('test_id', testId);
          
        if (error) {
          console.error("Error updating assessment with extracted text:", error);
        } else {
          console.log("Successfully updated assessment with extracted text");
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

1. Analyze the question paper to understand the questions and their marks allocation.
2. Analyze the answer key to understand the correct answers and valuation criteria.
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
${JSON.stringify(questionPaper)}

Answer Key for Test ID ${testId}:
${JSON.stringify(answerKey)}

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
      
      // Add the extracted text if available
      if (extractedStudentText) {
        evaluation.text = extractedStudentText;
        evaluation.isOcrProcessed = true;
        if (studentAnswer?.zip_url) {
          evaluation.zipProcessed = true;
          evaluation.zip_url = studentAnswer.zip_url;
        }
      }
      
      // Add extracted text from question paper and answer key
      evaluation.questionPaperText = extractedQuestionText;
      evaluation.answerKeyText = extractedAnswerKeyText;
      
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
