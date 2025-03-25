
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { createBedrockService } from "./services/bedrock-service.ts";
import { getDocumentPagesAsImages } from "./services/document-converter.ts";
import { isPdfUrl } from "./utils/image-processing.ts";

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

      // CRITICAL: Process image URLs - ALWAYS FULLY convert PDFs to images first before sending to Bedrock
      let questionPaperImages: string[] = [];
      let answerKeyImages: string[] = [];
      let studentAnswerImages: string[] = [];
      
      try {
        // Process question paper - ALWAYS FULLY convert PDF files
        console.log("Processing question paper:", questionPaper.url);
        if (isPdfUrl(questionPaper.url)) {
          console.log("Question paper is PDF, converting to images");
          try {
            questionPaperImages = await getDocumentPagesAsImages(questionPaper.url);
            if (questionPaperImages.length === 0) {
              throw new Error(`Failed to convert PDF to images: ${questionPaper.url}`);
            }
            console.log(`Converted question paper to ${questionPaperImages.length} images`);
          } catch (pdfError) {
            console.error(`Error converting question paper PDF: ${pdfError.message}`);
            return new Response(
              JSON.stringify({
                error: "Question paper PDF conversion error",
                details: pdfError.message,
                url: questionPaper.url
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
        } else {
          console.log("Question paper is not PDF, using direct URL");
          questionPaperImages = [questionPaper.url];
        }
        
        // Process answer key - ALWAYS FULLY convert PDF files
        console.log("Processing answer key:", answerKey.url);
        if (isPdfUrl(answerKey.url)) {
          console.log("Answer key is PDF, converting to images");
          try {
            answerKeyImages = await getDocumentPagesAsImages(answerKey.url);
            if (answerKeyImages.length === 0) {
              throw new Error(`Failed to convert PDF to images: ${answerKey.url}`);
            }
            console.log(`Converted answer key to ${answerKeyImages.length} images`);
          } catch (pdfError) {
            console.error(`Error converting answer key PDF: ${pdfError.message}`);
            return new Response(
              JSON.stringify({
                error: "Answer key PDF conversion error",
                details: pdfError.message,
                url: answerKey.url
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
        } else {
          console.log("Answer key is not PDF, using direct URL");
          answerKeyImages = [answerKey.url];
        }
        
        // Process student answer - ALWAYS FULLY convert PDF files or use pre-processed images if available
        if (studentAnswer.zip_url) {
          console.log("Using pre-processed images for student answer");
          studentAnswerImages = Array.isArray(studentAnswer.zip_url) ? 
            studentAnswer.zip_url : [studentAnswer.zip_url];
        } else if (isPdfUrl(studentAnswer.url)) {
          console.log("Student answer is PDF, converting to images");
          try {
            studentAnswerImages = await getDocumentPagesAsImages(studentAnswer.url);
            if (studentAnswerImages.length === 0) {
              throw new Error(`Failed to convert PDF to images: ${studentAnswer.url}`);
            }
            console.log(`Converted student answer to ${studentAnswerImages.length} images`);
          } catch (pdfError) {
            console.error(`Error converting student answer PDF: ${pdfError.message}`);
            return new Response(
              JSON.stringify({
                error: "Student answer PDF conversion error",
                details: pdfError.message,
                url: studentAnswer.url
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
        } else {
          console.log("Student answer is not PDF, using direct URL");
          studentAnswerImages = [studentAnswer.url];
        }
        
        // Final check for PDFs - verify no PDFs remain in the images lists
        const allImages = [...questionPaperImages, ...answerKeyImages, ...studentAnswerImages];
        for (const imageUrl of allImages) {
          if (isPdfUrl(imageUrl)) {
            console.error(`PDF file detected in processed images: ${imageUrl}`);
            return new Response(
              JSON.stringify({
                error: "PDF file detected in processed images",
                details: `${imageUrl}. All PDFs must be converted to images first.`,
                help: "Please pre-process PDF files to images before evaluation."
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
        }
        
        console.log("All PDFs have been successfully converted to images");
      } catch (imageProcessingError) {
        console.error("Error converting documents to images:", imageProcessingError);
        return new Response(
          JSON.stringify({
            error: "Document conversion error",
            details: imageProcessingError.message,
            help: "Please ensure all PDFs are pre-converted to images before evaluation."
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      console.log(`Processed documents to images: Question Paper (${questionPaperImages.length}), Answer Key (${answerKeyImages.length}), Student Answer (${studentAnswerImages.length})`);

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
        - Number of Images: ${questionPaperImages.length}

        ## Answer Key
        - Topic: ${answerKey.topic}
        - Number of Images: ${answerKeyImages.length}

        ## Student Answer Sheet
        - Number of Images: ${studentAnswerImages.length}

        Provide a detailed evaluation, including scores for each question and a total score for the paper.
      `;

      // Combine all image URLs for processing
      // Process images in batches of 4 (Claude's limit)
      const allImages = [...questionPaperImages, ...answerKeyImages, ...studentAnswerImages];
      
      // Batch process the images (max 4 per request)
      const batchSize = 4;
      let combinedResult = '';
      
      for (let i = 0; i < allImages.length; i += batchSize) {
        const batch = allImages.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allImages.length/batchSize)} with ${batch.length} images`);
        console.log("Batch images:", batch);
        
        const batchPrompt = `${userPrompt}\n\n[This is batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allImages.length/batchSize)}]`;
        
        try {
          // Invoke Bedrock API to evaluate this batch
          const batchResult = await bedrockService.processImagesWithVision({
            prompt: batchPrompt,
            imageUrls: batch,
            max_tokens: 4000,
            temperature: 0.5,
            system: systemPrompt
          });
          
          // Add batch results to combined results
          if (combinedResult) {
            combinedResult += '\n\n--- NEXT BATCH ---\n\n';
          }
          combinedResult += batchResult;
          
          console.log(`Batch ${Math.floor(i/batchSize) + 1} processed successfully`);
        } catch (batchError) {
          console.error(`Error processing batch ${Math.floor(i/batchSize) + 1}:`, batchError);
          // Continue with other batches
          if (combinedResult) {
            combinedResult += '\n\n--- BATCH ERROR ---\n\n';
          }
          combinedResult += `Error processing batch ${Math.floor(i/batchSize) + 1}: ${batchError.message || 'Unknown error'}`;
        }
      }

      console.log(`Evaluation complete: ${combinedResult.substring(0, 200)}...`);

      // Return the evaluation result
      return new Response(
        JSON.stringify({
          text: combinedResult,
          questionPaperImages,
          answerKeyImages,
          studentAnswerImages
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
