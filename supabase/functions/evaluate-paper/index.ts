
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { processStudentAnswer, processQuestionPaper, processAnswerKey, addCacheBuster } from './document-processor.ts';
import { evaluateAnswers, processEvaluation } from './evaluator.ts';

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
    // Get OpenAI API key from environment
    const apiKey = Deno.env.get('OPENAI_API_KEY') || '';
    console.log("Using API Key: " + apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 4));
    
    // Parse the request body
    const { questionPaper, answerKey, studentAnswer, studentInfo, testId } = await req.json();

    console.log("Received evaluation request for student:", studentInfo?.name);
    console.log("Student answer type:", studentAnswer?.url ? "URL provided" : "Text provided");
    console.log("ZIP URL available:", studentAnswer?.zip_url ? "Yes" : "No");
    console.log("Test ID for evaluation:", testId);
    
    // Add cache-busting parameter to URLs to prevent caching issues
    if (questionPaper?.url) questionPaper.url = addCacheBuster(questionPaper.url);
    if (answerKey?.url) answerKey.url = addCacheBuster(answerKey.url);
    if (studentAnswer?.url) studentAnswer.url = addCacheBuster(studentAnswer.url);
    if (studentAnswer?.zip_url) studentAnswer.zip_url = addCacheBuster(studentAnswer.zip_url);
    
    // Process documents to extract text
    const processedStudentAnswer = await processStudentAnswer(apiKey, studentAnswer, testId, studentInfo);
    
    const { processedDocument: processedQuestionPaper, extractedText: extractedQuestionText } = 
      await processQuestionPaper(apiKey, questionPaper, testId);
    
    const { processedDocument: processedAnswerKey, extractedText: extractedAnswerKeyText } = 
      await processAnswerKey(apiKey, answerKey, testId);
    
    // Evaluate the student's answers
    const evaluation = await evaluateAnswers(
      apiKey,
      testId,
      processedQuestionPaper,
      processedAnswerKey,
      processedStudentAnswer,
      studentInfo
    );
    
    // Process the evaluation results
    const processedEvaluation = processEvaluation(
      evaluation,
      testId,
      studentAnswer,
      processedStudentAnswer.text,
      extractedQuestionText,
      extractedAnswerKeyText
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

// Import required for database operations
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
