
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { createBedrockService } from "./services/bedrock-service.ts";
import { getAnswerSheetUrl, getAnswerSheetZipUrl } from "./utils/file-upload-utils.ts";

// CORS headers to allow requests from any origin
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Add this code near the start of your serve function, before processing any evaluation
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Get AWS credentials from environment variables
  const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
  const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
  const awsRegion = Deno.env.get('AWS_REGION') || 'us-east-1';
  
  if (!awsAccessKeyId || !awsSecretAccessKey) {
    return new Response(
      JSON.stringify({
        error: 'AWS credentials not configured',
        details: 'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables must be set'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  console.log(`Using AWS credentials (first 4 chars of Access Key ID): ${awsAccessKeyId.substring(0, 4)}... in region: ${awsRegion}`);
  
  try {
    // Initialize Bedrock service
    const bedrockService = createBedrockService(awsAccessKeyId, awsSecretAccessKey, awsRegion);
    
    // Test AWS connection and permissions before proceeding
    const connectionTest = await bedrockService.testConnection();
    if (!connectionTest.success) {
      return new Response(
        JSON.stringify({
          error: 'AWS Bedrock authentication failed',
          details: connectionTest.message,
          help: 'Your IAM user needs permissions for bedrock-runtime:InvokeModel actions. Please update your IAM policy or use different credentials.'
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log("AWS Bedrock connection verified: ready to process evaluation");
    
    // Continue with the existing code
    try {
      const {
        questionPaper,
        answerKey,
        studentAnswer,
        studentInfo,
        testId,
        retryAttempt = 0
      } = await req.json();

      if (!questionPaper || !questionPaper.url || !questionPaper.topic) {
        return new Response(
          JSON.stringify({ error: "Question paper URL and topic are required" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!answerKey || !answerKey.url || !answerKey.topic) {
        return new Response(
          JSON.stringify({ error: "Answer key URL and topic are required" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!studentAnswer || !studentAnswer.url) {
        return new Response(
          JSON.stringify({ error: "Student answer sheet URL is required" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!studentInfo || !studentInfo.id || !studentInfo.name) {
        return new Response(
          JSON.stringify({ error: "Student ID and name are required" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Evaluating paper for student: ${studentInfo.name} (ID: ${studentInfo.id})`);
      console.log(`Question paper: ${questionPaper.url} (Topic: ${questionPaper.topic})`);
      console.log(`Answer key: ${answerKey.url} (Topic: ${answerKey.topic})`);
      console.log(`Student answer sheet: ${studentAnswer.url}`);

      // Construct the prompt for Claude
      const systemPrompt = `
        You are an expert evaluator of student papers. Your task is to compare a student's answer sheet to an answer key and provide a detailed evaluation.
        - Provide feedback on the student's answers, noting areas of correctness and areas for improvement.
        - Assign scores for each question based on the answer key, and provide a total score for the paper.
        - Identify any potential issues with the student's handwriting or the image quality that may have affected your evaluation.
        - Focus on the accuracy and completeness of the answers, and provide constructive criticism to help the student improve.
        - Do not make assumptions about the context of the questions or answers.
        - Be concise and to the point.
      `;

      const userPrompt = `
        Evaluate the student's answer sheet in comparison to the provided answer key.

        ## Student Information
        - Student Name: ${studentInfo.name}
        - Student ID: ${studentInfo.id}

        ## Question Paper
        - Topic: ${questionPaper.topic}
        - URL: ${questionPaper.url}

        ## Answer Key
        - Topic: ${answerKey.topic}
        - URL: ${answerKey.url}

        ## Student Answer Sheet
        - URL: ${studentAnswer.url}
        ${studentAnswer.zip_url ? `- ZIP URL: ${studentAnswer.zip_url}` : ''}

        Provide a detailed evaluation, including scores for each question and a total score for the paper.
      `;

      // Invoke Bedrock API to evaluate the paper
      const evaluationResult = await bedrockService.processImagesWithVision({
        prompt: userPrompt,
        imageUrls: [questionPaper.url, answerKey.url, studentAnswer.url],
        max_tokens: 4000,
        temperature: 0.5,
        system: systemPrompt
      });

      console.log(`Evaluation result: ${evaluationResult}`);

      // Return the evaluation result
      return new Response(
        JSON.stringify({
          text: evaluationResult,
          questionPaperUrl: questionPaper.url,
          answerKeyUrl: answerKey.url,
          studentAnswerUrl: studentAnswer.url
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error("Error in evaluate-paper function:", error);
      return new Response(
        JSON.stringify({
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Service initialization failed',
        details: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
