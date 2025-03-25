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
    
    // Process documents to extract text with improved error handling
    try {
      // Process student answer first
      const processedStudentAnswer = await processStudentAnswer(apiKey, studentAnswer, testId, studentInfo);
      
      // If we have existing question text, try to extract structured questions from it
      if (existingQuestionText && !extractedQuestions) {
        console.log("Using existing OCR text to extract questions");
        extractedQuestions = await extractQuestionsFromText(apiKey, existingQuestionText);
      }
      
      // If we don't have structured questions yet, process the question paper
      if (!extractedQuestions) {
        console.log("Processing question paper to extract structured questions");
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
        
        extractedQuestions = extractedQuestionsFromProcess;
        existingQuestionText = existingQuestionText || extractedQuestionText;
      }
      
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
      
      const finalAnswerKeyText = existingAnswerText || extractedAnswerKeyText;
      
      // Perform semantic matching if we have both question paper and student answer
      if (existingQuestionText && processedStudentAnswer.text) {
        try {
          console.log("Attempting semantic matching of student answers to questions");
          
          const matches = await matchAnswersToQuestions(
            apiKey,
            existingQuestionText,
            processedStudentAnswer.text
          );
          
          console.log(`Found ${matches?.matches?.length || 0} potential question-answer matches through semantic matching`);
        } catch (matchError) {
          console.error("Error during semantic matching:", matchError);
          // Continue with evaluation even if matching fails
        }
      }
      
      // Perform the evaluation
      let evaluation;
      
      // If we have extracted questions, use the question-based evaluation flow
      if (extractedQuestions && extractedQuestions.length > 0 && processedStudentAnswer.text) {
        console.log(`Using question-based evaluation with ${extractedQuestions.length} extracted questions`);
        
        // Use our specialized evaluation function that leverages extracted questions
        evaluation = await evaluateWithExtractedQuestions(
          apiKey,
          extractedQuestions,
          finalAnswerKeyText,
          processedStudentAnswer.text,
          studentInfo
        );
      } else {
        console.log("Using standard evaluation flow without extracted questions");
        
        // Fall back to the original evaluation method
        evaluation = await evaluateAnswers(
          apiKey,
          testId,
          {text: existingQuestionText},
          {text: finalAnswerKeyText},
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
        existingQuestionText,
        finalAnswerKeyText
      );
      
      // Return the processed evaluation
      return new Response(
        JSON.stringify(processedEvaluation),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (processingError) {
      console.error('Error during document processing:', processingError);
      
      // If this is retry attempt and still failing, let's provide more diagnostic information
      if (retryAttempt > 0) {
        return new Response(
          JSON.stringify({ 
            error: `Processing error after ${retryAttempt} retry attempts: ${processingError.message}`,
            details: {
              questionPaperAvailable: !!existingQuestionText,
              answerKeyAvailable: !!existingAnswerText,
              studentAnswerType: studentAnswer?.url ? 'URL' : (studentAnswer?.text ? 'Text' : 'None'),
              zipUrlProvided: !!studentAnswer?.zip_url,
              errorMessage: processingError.message,
              studentInfo
            }
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw processingError;
    }
    
  } catch (error) {
    console.error('Error in evaluate-paper function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
