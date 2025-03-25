
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { processStudentAnswer, processQuestionPaper, processAnswerKey, addCacheBuster } from './document-processor.ts';
import { evaluateAnswers, processEvaluation } from './evaluator.ts';
import { evaluateWithExtractedQuestions, matchAnswersToQuestions } from './ocr.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Import required for database operations
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get OpenAI API key from environment
    const apiKey = Deno.env.get('OPENAI_API_KEY') || '';
    console.log("Using API Key: " + apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 4));
    
    // Parse the request body
    const { questionPaper, answerKey, studentAnswer, studentInfo, testId, retryAttempt = 0 } = await req.json();

    console.log("Received evaluation request for student:", studentInfo?.name);
    console.log("Student answer type:", studentAnswer?.url ? "URL provided" : "Text provided");
    console.log("ZIP URL available:", studentAnswer?.zip_url ? "Yes" : "No");
    console.log("Test ID for evaluation:", testId);
    console.log("Retry attempt:", retryAttempt);
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check if we already have OCR text for question paper and answer key
    let existingQuestionText = null;
    let existingAnswerText = null;
    let extractedQuestions = null;
    
    if (questionPaper?.url) {
      console.log("Checking for existing OCR text for question paper");
      const { data: questionDoc } = await supabase
        .from('subject_documents')
        .select('ocr_text')
        .eq('document_url', questionPaper.url)
        .maybeSingle();
        
      if (questionDoc?.ocr_text) {
        console.log("Found existing OCR text for question paper");
        existingQuestionText = questionDoc.ocr_text;
      }
    }
    
    if (answerKey?.url) {
      console.log("Checking for existing OCR text for answer key");
      const { data: answerDoc } = await supabase
        .from('subject_documents')
        .select('ocr_text')
        .eq('document_url', answerKey.url)
        .maybeSingle();
        
      if (answerDoc?.ocr_text) {
        console.log("Found existing OCR text for answer key");
        existingAnswerText = answerDoc.ocr_text;
      }
    }
    
    // Add cache-busting parameter to URLs to prevent caching issues
    if (questionPaper?.url) questionPaper.url = addCacheBuster(questionPaper.url);
    if (answerKey?.url) answerKey.url = addCacheBuster(answerKey.url);
    if (studentAnswer?.url) studentAnswer.url = addCacheBuster(studentAnswer.url);
    if (studentAnswer?.zip_url) studentAnswer.zip_url = addCacheBuster(studentAnswer.zip_url);
    
    // Process documents to extract text
    const processedStudentAnswer = await processStudentAnswer(apiKey, studentAnswer, testId, studentInfo);
    
    // Process the question paper with special handling to extract structured questions
    // Pass the existing OCR text if available
    const { 
      processedDocument: processedQuestionPaper, 
      extractedText: extractedQuestionText,
      questions: extractedQuestionsFromProcess
    } = await processQuestionPaper(
      apiKey, 
      questionPaper, 
      testId, 
      existingQuestionText
    );
    
    // Process the answer key, using existing OCR text if available
    const { 
      processedDocument: processedAnswerKey, 
      extractedText: extractedAnswerKeyText 
    } = await processAnswerKey(
      apiKey, 
      answerKey, 
      testId, 
      existingAnswerText
    );
    
    // Use the extracted questions or request extraction if needed
    if (existingQuestionText && !extractedQuestionsFromProcess) {
      console.log("Using existing OCR text to extract questions");
      // We have OCR text but no questions extracted yet, try to extract them
      try {
        const questionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
                content: 'You are an AI assistant that extracts questions from examination papers. You must identify each question, its number, and the marks allocated to it.' 
              },
              { 
                role: 'user', 
                content: `Extract all the questions from this question paper. Return a JSON array of question objects with the following format:
                {
                  "question_no": "1",
                  "question": "The full text of the question",
                  "marks": 5
                }
                
                Question Paper:
                ${existingQuestionText}`
              }
            ],
            temperature: 0.2,
            response_format: { type: "json_object" }
          }),
        });

        if (questionResponse.ok) {
          const data = await questionResponse.json();
          try {
            const parsedQuestions = JSON.parse(data.choices[0].message.content);
            if (parsedQuestions.questions && Array.isArray(parsedQuestions.questions)) {
              extractedQuestions = parsedQuestions.questions;
              console.log(`Successfully extracted ${extractedQuestions.length} questions from existing OCR text`);
            }
          } catch (parseError) {
            console.error("Error parsing extracted questions:", parseError);
          }
        }
      } catch (extractError) {
        console.error("Error extracting questions from existing OCR text:", extractError);
      }
    } else {
      extractedQuestions = extractedQuestionsFromProcess;
    }
    
    let evaluation;
    
    // If we have extracted questions, use the question-based evaluation flow
    if (extractedQuestions && processedStudentAnswer.text) {
      console.log(`Using question-based evaluation with ${extractedQuestions.length} extracted questions`);
      
      // First try to match student answers to question numbers
      if (processedStudentAnswer.text) {
        try {
          console.log("Attempting semantic matching of student answers to questions");
          
          const questionText = extractedQuestionText || existingQuestionText || 
                               (processedQuestionPaper ? processedQuestionPaper.text : "");
          
          const answerText = processedStudentAnswer.text;
          
          // Perform semantic matching if we have both question paper and student answer
          if (questionText && answerText) {
            const matches = await matchAnswersToQuestions(
              apiKey,
              questionText,
              answerText
            );
            
            console.log(`Found ${matches?.matches?.length || 0} potential question-answer matches through semantic matching`);
          }
        } catch (matchError) {
          console.error("Error during semantic matching:", matchError);
          // Continue with evaluation even if matching fails
        }
      }
      
      // Use our specialized evaluation function that leverages extracted questions
      evaluation = await evaluateWithExtractedQuestions(
        apiKey,
        extractedQuestions,
        extractedAnswerKeyText || existingAnswerText || (processedAnswerKey ? processedAnswerKey.text : null),
        processedStudentAnswer.text,
        studentInfo
      );
    } else {
      console.log("Using standard evaluation flow without extracted questions");
      
      // Fall back to the original evaluation method
      evaluation = await evaluateAnswers(
        apiKey,
        testId,
        processedQuestionPaper,
        processedAnswerKey,
        processedStudentAnswer,
        studentInfo
      );
    }
    
    // Process the evaluation results
    const processedEvaluation = processEvaluation(
      evaluation,
      testId,
      studentAnswer,
      processedStudentAnswer.text,
      extractedQuestionText || existingQuestionText,
      extractedAnswerKeyText || existingAnswerText
    );
    
    // Return the processed evaluation
    return new Response(
      JSON.stringify(processedEvaluation),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in evaluate-paper function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
