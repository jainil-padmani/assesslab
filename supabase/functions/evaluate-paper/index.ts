
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    
    // Process the student answer if it's a PDF or image
    let processedStudentAnswer = studentAnswer;
    
    if (studentAnswer?.url && (
        studentAnswer.url.includes('.jpg') || 
        studentAnswer.url.includes('.jpeg') || 
        studentAnswer.url.includes('.png') ||
        studentAnswer.url.includes('.pdf')
    )) {
      console.log("Detected document/image answer sheet, performing OCR with GPT-4o...");
      console.log("URL:", studentAnswer.url);
      
      try {
        // Use GPT-4o's vision capabilities for OCR
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
        } else {
          const ocrResult = await ocrResponse.json();
          const extractedText = ocrResult.choices[0]?.message?.content;
          
          console.log("OCR extraction successful, extracted text length:", extractedText?.length || 0);
          console.log("Sample extracted text:", extractedText?.substring(0, 100) + "...");
          
          // Update the student answer with OCR text
          processedStudentAnswer = {
            ...studentAnswer,
            text: extractedText,
            isOcrProcessed: true,
            testId: testId // Include test ID to ensure answers are synced with the correct test
          };
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
    
    // Make request to OpenAI with the correct API key format
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
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
