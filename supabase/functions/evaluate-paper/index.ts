
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
    // Log the API Keys being used (masked)
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';
    const pixtralApiKey = Deno.env.get('PIXTRAL_API_KEY') || '';
    console.log("Using OpenAI API Key: " + openaiApiKey.substring(0, 5) + '...' + openaiApiKey.substring(openaiApiKey.length - 4));
    console.log("Using Pixtral API Key: " + pixtralApiKey.substring(0, 5) + '...' + pixtralApiKey.substring(pixtralApiKey.length - 4));
    
    const { questionPaper, answerKey, studentAnswer, studentInfo } = await req.json();

    console.log("Received evaluation request for student:", studentInfo?.name);
    console.log("Student answer type:", studentAnswer?.url ? "URL provided" : "Text provided");
    
    // Add cache-busting parameter to URLs to prevent caching issues
    const addCacheBuster = (url: string) => {
      const cacheBuster = `cache=${Date.now()}`;
      return url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;
    };
    
    // Apply cache busting to all URLs
    if (questionPaper?.url) questionPaper.url = addCacheBuster(questionPaper.url);
    if (answerKey?.url) answerKey.url = addCacheBuster(answerKey.url);
    if (studentAnswer?.url) studentAnswer.url = addCacheBuster(studentAnswer.url);
    
    // OCR Processing Results
    let processedQuestionPaper = { ...questionPaper };
    let processedAnswerKey = { ...answerKey };
    let processedStudentAnswer = { ...studentAnswer };
    
    // Function to extract text using Pixtral's OCR capabilities
    const extractTextWithPixtral = async (url: string, documentName: string) => {
      console.log(`Processing ${documentName} with Pixtral OCR: ${url}`);
      
      try {
        const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Bearer ${pixtralApiKey}`
          },
          body: JSON.stringify({
            model: "mistral-large-latest",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Extract all the text content from this document. Format the content to preserve structure. This is a ${documentName}.`
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: url
                    }
                  }
                ]
              }
            ],
            temperature: 0.1,
            max_tokens: 4096
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Pixtral OCR error for ${documentName}:`, errorText);
          return {
            text: `Failed to extract text from ${documentName}. Error: ${errorText}`,
            isOcrProcessed: false,
            ocrError: errorText
          };
        }

        const result = await response.json();
        const extractedText = result.choices[0]?.message?.content || "";
        console.log(`OCR extraction successful for ${documentName}, extracted text length:`, extractedText.length);
        console.log("Sample extracted text:", extractedText.substring(0, 100) + "...");
        
        return {
          text: extractedText,
          isOcrProcessed: true,
          ocrSource: "pixtral"
        };
      } catch (error) {
        console.error(`Error during Pixtral OCR processing for ${documentName}:`, error);
        return {
          text: `Error processing document. Technical details: ${error.message}`,
          isOcrProcessed: false,
          ocrError: error.message,
          ocrSource: "pixtral-error"
        };
      }
    };

    // Process all documents with Pixtral OCR
    // Process question paper if URL is provided
    if (questionPaper?.url) {
      const extractionResult = await extractTextWithPixtral(questionPaper.url, "question paper");
      processedQuestionPaper = {
        ...questionPaper,
        ...extractionResult
      };
    }
    
    // Process answer key if URL is provided
    if (answerKey?.url) {
      const extractionResult = await extractTextWithPixtral(answerKey.url, "answer key");
      processedAnswerKey = {
        ...answerKey,
        ...extractionResult
      };
    }
    
    // Process student answer if URL is provided
    if (studentAnswer?.url) {
      const extractionResult = await extractTextWithPixtral(studentAnswer.url, "student answer sheet");
      processedStudentAnswer = {
        ...studentAnswer,
        ...extractionResult
      };
    }
    
    // Prepare the prompt for OpenAI evaluation
    const systemPrompt = `
You are an AI evaluator responsible for grading a student's answer sheet.
The user will provide you with the question paper(s), answer key(s), and the student's answer sheet(s).
Analyse the question paper to understand the questions and their marks.
Analyse the answer key to understand the correct answers and valuation criteria.
Assess the answers generously. Award 0 marks for completely incorrect or unattempted answers.
Your task is to grade the answer sheet and return it in a JSON format.
If this is a revaluation it will be mentioned in the request and you should strictly follow the revaluation prompt.
`;

    const userPrompt = `
Question Paper:
${JSON.stringify(processedQuestionPaper)}

Answer Key:
${JSON.stringify(processedAnswerKey)}

Student Answer Sheet:
${JSON.stringify(processedStudentAnswer)}

Student Info:
${JSON.stringify(studentInfo)}

Provide the response in a JSON format that contains:

student_name: "${studentInfo?.name || 'Unknown'}"
roll_no: "${studentInfo?.roll_number || 'Unknown'}"
class: "${studentInfo?.class || 'Unknown'}"
subject: "${studentInfo?.subject || 'Unknown'}"

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
        'Authorization': `Bearer ${openaiApiKey}`,
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
      
      // Add the OCR data to the evaluation
      evaluation.ocr_data = {
        question_paper: {
          url: questionPaper?.url,
          extracted_text: processedQuestionPaper?.text,
          is_processed: processedQuestionPaper?.isOcrProcessed,
          source: processedQuestionPaper?.ocrSource
        },
        answer_key: {
          url: answerKey?.url,
          extracted_text: processedAnswerKey?.text,
          is_processed: processedAnswerKey?.isOcrProcessed,
          source: processedAnswerKey?.ocrSource
        },
        student_answer: {
          url: studentAnswer?.url,
          extracted_text: processedStudentAnswer?.text,
          is_processed: processedStudentAnswer?.isOcrProcessed,
          source: processedStudentAnswer?.ocrSource
        }
      };
      
      // Add the answer sheet URL to the evaluation for reference
      if (studentAnswer?.url) {
        evaluation.answer_sheet_url = studentAnswer.url;
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
