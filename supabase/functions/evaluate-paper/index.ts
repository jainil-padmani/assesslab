
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
    
    // Process all documents for comprehensive OCR
    let questionPaperOcr = null;
    let answerKeyOcr = null;
    let studentAnswerOcr = null;
    
    // Function to extract text from document URLs using GPT-4o Vision
    const extractTextFromDocument = async (docUrl, docType, zipUrl = null) => {
      if (!docUrl) {
        return `No ${docType} document URL provided`;
      }
      
      console.log(`Extracting text from ${docType} document:`, docUrl);
      console.log(`ZIP URL available for ${docType}:`, zipUrl ? "Yes" : "No");
      
      try {
        // Check if we have a ZIP file to process (improved OCR)
        if (zipUrl) {
          console.log(`Processing ZIP for ${docType} document:`, zipUrl);
          
          // Fetch the ZIP file
          const zipResponse = await fetch(zipUrl, { 
            headers: { 'Cache-Control': 'no-cache' }
          });
          
          if (!zipResponse.ok) {
            console.error(`Failed to fetch ZIP for ${docType}:`, zipResponse.statusText);
            // Fall back to direct URL processing
          } else {
            // Process ZIP file contents
            const zipData = await zipResponse.arrayBuffer();
            const zip = await JSZip.loadAsync(zipData);
            const imageFiles = [];
            
            // Extract images from ZIP
            const imagePromises = [];
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
            
            // Sort images by filename
            imageFiles.sort((a, b) => a.name.localeCompare(b.name));
            console.log(`Extracted ${imageFiles.length} images from ${docType} ZIP`);
            
            if (imageFiles.length > 0) {
              // Use GPT-4o vision for OCR on all images
              const messages = [
                { 
                  role: 'system', 
                  content: `You are an OCR expert specialized in extracting text from ${docType} documents.
                  
                  For each image:
                  1. Extract all visible text content.
                  2. Maintain the structure of text, including paragraphs, lists, and formatting.
                  3. Preserve question numbers and any identifiers.
                  4. If there are multiple pages, maintain page order and continuity.
                  5. For ${docType === 'answer key' ? 'answer keys' : docType === 'question paper' ? 'question papers' : 'student answer sheets'}, pay special attention to:
                     - ${docType === 'answer key' ? 'Correct answers, scoring rubrics, and evaluation criteria' : 
                        docType === 'question paper' ? 'Question numbering, instructions, and marks allocation' : 
                                                     'Handwritten text, diagrams, and calculations'}
                  
                  Your response should be well-structured and preserve the original document's organization.`
                }
              ];
              
              // Create user message with text and images
              const userContent = [
                { 
                  type: 'text', 
                  text: `This is a ${docType} for test ID: ${testId}. Extract all text content from these ${imageFiles.length} pages:`
                }
              ];
              
              // Add each image to the request (up to 10 images per batch for better handling)
              const maxImagesPerBatch = 10;
              let extractedText = '';
              
              // Process images in batches to handle documents with many pages
              for (let batchStart = 0; batchStart < imageFiles.length; batchStart += maxImagesPerBatch) {
                const batchEnd = Math.min(batchStart + maxImagesPerBatch, imageFiles.length);
                console.log(`Processing batch ${batchStart + 1} to ${batchEnd} of ${imageFiles.length} for ${docType}`);
                
                const batchContent = [
                  { 
                    type: 'text', 
                    text: `This is a ${docType} for test ID: ${testId}. Extract all text content from pages ${batchStart + 1} to ${batchEnd}:`
                  }
                ];
                
                // Add images for this batch
                for (let i = batchStart; i < batchEnd; i++) {
                  batchContent.push({ 
                    type: 'image_url', 
                    image_url: { 
                      url: imageFiles[i].dataUrl,
                      detail: "high" 
                    } 
                  });
                }
                
                const batchMessages = [
                  messages[0],
                  { role: 'user', content: batchContent }
                ];
                
                // Call OpenAI API for this batch
                const ocrResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: batchMessages,
                    temperature: 0.1,
                    max_tokens: 4000,
                  }),
                });
                
                if (!ocrResponse.ok) {
                  const errorText = await ocrResponse.text();
                  console.error(`OpenAI OCR error for ${docType} batch ${batchStart}:`, errorText);
                  extractedText += `\n\n[Error processing pages ${batchStart + 1}-${batchEnd}: ${errorText}]`;
                } else {
                  const ocrResult = await ocrResponse.json();
                  const batchText = ocrResult.choices[0]?.message?.content || '';
                  extractedText += '\n\n' + batchText;
                }
              }
              
              console.log(`Successfully extracted text from ${docType} using ZIP processing`);
              return extractedText.trim();
            }
          }
        }
        
        // Direct URL processing (fallback or primary method if no ZIP)
        console.log(`Processing direct URL for ${docType} document`);
        
        // Check file type to determine appropriate processing
        const isPdf = docUrl.toLowerCase().includes('.pdf');
        const isImage = /\.(jpe?g|png|gif|webp)$/i.test(docUrl);
        
        if (!isPdf && !isImage) {
          return `Unsupported file format for ${docType} document. Only PDF and image files are supported.`;
        }
        
        if (isPdf) {
          // For PDFs, provide a basic extraction with recommendation for enhanced OCR
          return `PDF detected for ${docType}. For better results, please regenerate the assessment to use enhanced OCR via ZIP processing.`;
        }
        
        // For images, use GPT-4o's vision capability
        const ocrResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { 
                role: 'system', 
                content: `You are an OCR expert specialized in extracting text from ${docType} documents.`
              },
              { 
                role: 'user', 
                content: [
                  { 
                    type: 'text', 
                    text: `This is a ${docType} for test ID: ${testId}. Extract all text content:`
                  },
                  { 
                    type: 'image_url', 
                    image_url: { 
                      url: docUrl,
                      detail: "high" 
                    } 
                  }
                ] 
              }
            ],
            temperature: 0.1,
            max_tokens: 4000,
          }),
        });
        
        if (!ocrResponse.ok) {
          const errorText = await ocrResponse.text();
          console.error(`OpenAI OCR error for ${docType}:`, errorText);
          return `Error extracting text from ${docType}: ${errorText}`;
        }
        
        const ocrResult = await ocrResponse.json();
        const extractedText = ocrResult.choices[0]?.message?.content;
        console.log(`Successfully extracted text from ${docType} using direct URL`);
        return extractedText;
      } catch (error) {
        console.error(`Error extracting text from ${docType}:`, error);
        return `Error processing ${docType} document: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    };
    
    // Extract text from all documents in parallel
    console.log("Starting parallel OCR extraction for all documents");
    const [questionOcr, answerOcr, studentOcr] = await Promise.all([
      extractTextFromDocument(questionPaper?.url, 'question paper'),
      extractTextFromDocument(answerKey?.url, 'answer key'),
      extractTextFromDocument(studentAnswer?.url, 'student answer', studentAnswer?.zip_url)
    ]);
    
    questionPaperOcr = questionOcr;
    answerKeyOcr = answerOcr;
    studentAnswerOcr = studentOcr;
    
    console.log("OCR extraction completed for all documents");
    
    // Process the student answer if it's provided as a URL
    let processedStudentAnswer = studentAnswer;
    
    // Add extracted text to the student answer object
    if (studentAnswerOcr) {
      processedStudentAnswer = {
        ...studentAnswer,
        text: studentAnswerOcr,
        isOcrProcessed: true,
        testId: testId
      };
    }
    
    // Update the assessment record with the extracted text
    if (studentAnswerOcr && studentInfo?.id) {
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
          .update({ text_content: studentAnswerOcr })
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
      
      // Add the extracted OCR text for all documents
      evaluation.text = studentAnswerOcr;
      evaluation.questionPaperOcr = questionPaperOcr;
      evaluation.answerKeyOcr = answerKeyOcr;
      evaluation.isOcrProcessed = true;
      
      if (studentAnswer?.zip_url) {
        evaluation.zipProcessed = true;
        evaluation.zip_url = studentAnswer.zip_url;
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
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Add import for Supabase client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
