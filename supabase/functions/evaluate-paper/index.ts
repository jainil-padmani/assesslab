import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { processStudentAnswer, processQuestionPaper, processAnswerKey, addCacheBuster, stripQueryParams } from './document-processor.ts';
import { evaluateAnswers, processEvaluation } from './evaluator.ts';
import { 
  evaluateWithExtractedQuestions, 
  matchAnswersToQuestions, 
  extractQuestionsFromText,
  createBedrockService
} from './ocr.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Import required for database operations
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

serve(async (req) => {
  // Set a longer timeout for the request handling (5 minutes)
  const MAX_EXECUTION_TIME = 300000; // 5 minutes in milliseconds
  const requestTimeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Request timed out after 5 minutes")), MAX_EXECUTION_TIME);
  });

  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Get AWS Bedrock credentials from environment
    const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID') || '';
    const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY') || '';
    const awsRegion = Deno.env.get('AWS_REGION') || 'us-east-1';
    
    if (!awsAccessKeyId || !awsSecretAccessKey) {
      return new Response(
        JSON.stringify({ 
          error: 'AWS credentials not configured', 
          details: 'Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in the Supabase Edge Function secrets. Your IAM user must have access to Amazon Bedrock services.'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const awsCredentials = {
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey,
      region: awsRegion
    };
    
    console.log("Using AWS credentials with key ID: " + awsAccessKeyId.substring(0, 5) + '...' + " in region: " + awsRegion);
    
    // Parse the request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (jsonError) {
      console.error("Error parsing request body:", jsonError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { questionPaper, answerKey, studentAnswer, studentInfo, testId, retryAttempt = 0 } = requestBody;

    if (!testId) {
      return new Response(
        JSON.stringify({ error: "Test ID is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Received evaluation request for student:", studentInfo?.name);
    console.log("Student answer type:", studentAnswer?.url ? "URL provided" : "Text provided");
    console.log("ZIP URL available:", studentAnswer?.zip_url ? "Yes" : "No");
    console.log("Test ID for evaluation:", testId);
    console.log("Retry attempt:", retryAttempt);
    
    // Verify Bedrock service connectivity before proceeding
    try {
      console.log("Verifying AWS Bedrock service connectivity");
      // Create a simple request to test the connection
      const bedrockService = createBedrockService(
        awsCredentials.accessKeyId,
        awsCredentials.secretAccessKey,
        awsCredentials.region
      );
      
      // We'll keep the test simple to avoid unnecessary costs
      await bedrockService.invokeModel({
        messages: [
          { role: "user", content: "Test connection" }
        ],
        max_tokens: 10,
        temperature: 0,
        system: "Reply with 'Connected' only"
      });
      
      console.log("AWS Bedrock service connection verified successfully");
    } catch (bedrockError) {
      console.error("Error connecting to AWS Bedrock service:", bedrockError);
      
      let errorMessage = "Failed to connect to AWS Bedrock service";
      let helpText = "Please check your AWS credentials, IAM permissions, and region configuration";
      
      // Add more specific error details based on the nature of the error
      if (bedrockError.message.includes("Authentication")) {
        errorMessage = "AWS Bedrock authentication failed";
        helpText = "Your IAM user needs permissions for bedrock:* actions. Please update your IAM policy or use different credentials.";
      } else if (bedrockError.message.includes("not found")) {
        errorMessage = "AWS Bedrock model not found";
        helpText = `The model may not be available in region ${awsRegion} or your account doesn't have access to it. Try a different region like us-east-1 or us-west-2.`;
      } else if (bedrockError.message.includes("timeout")) {
        errorMessage = "AWS Bedrock service connection timed out";
        helpText = `The Bedrock service in region ${awsRegion} may be experiencing issues or not available. Try a different region like us-east-1 or us-west-2.`;
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage, 
          details: bedrockError.message,
          help: helpText
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables are not set');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check if we already have OCR text for question paper and answer key
    let existingQuestionText = null;
    let existingAnswerText = null;
    let extractedQuestions = null;
    
    if (questionPaper?.url) {
      console.log("Checking for existing OCR text for question paper");
      
      try {
        const { data: questionDoc, error } = await supabase
          .from('subject_documents')
          .select('ocr_text')
          .eq('document_url', questionPaper.url)
          .maybeSingle();
          
        if (error) {
          console.error("Error fetching OCR text for question paper:", error);
        } else if (questionDoc?.ocr_text) {
          console.log("Found existing OCR text for question paper");
          existingQuestionText = questionDoc.ocr_text;
        }
      } catch (dbError) {
        console.error("Database error when checking existing OCR text:", dbError);
      }
    }
    
    if (answerKey?.url) {
      console.log("Checking for existing OCR text for answer key");
      
      try {
        const { data: answerDoc, error } = await supabase
          .from('subject_documents')
          .select('ocr_text')
          .eq('document_url', answerKey.url)
          .maybeSingle();
          
        if (error) {
          console.error("Error fetching OCR text for answer key:", error);
        } else if (answerDoc?.ocr_text) {
          console.log("Found existing OCR text for answer key");
          existingAnswerText = answerDoc.ocr_text;
        }
      } catch (dbError) {
        console.error("Database error when checking existing OCR text:", dbError);
      }
    }
    
    // Add cache-busting parameter to URLs for fetching
    if (questionPaper?.url) questionPaper.url = addCacheBuster(questionPaper.url);
    if (answerKey?.url) answerKey.url = addCacheBuster(answerKey.url);
    if (studentAnswer?.url) studentAnswer.url = addCacheBuster(studentAnswer.url);
    if (studentAnswer?.zip_url) {
      // Add cache buster for fetching, but prepare a clean URL for Claude 3.5
      studentAnswer.zip_url = addCacheBuster(studentAnswer.zip_url);
      studentAnswer.clean_zip_url = stripQueryParams(studentAnswer.zip_url);
      console.log("Clean ZIP URL for Claude 3.5:", studentAnswer.clean_zip_url);
    }
    
    // Process documents to extract text with improved error handling and timeout
    try {
      // Create a Promise.race between the actual processing and a timeout
      const processingPromise = async () => {
        // Process student answer first
        const processedStudentAnswer = await processStudentAnswer(awsCredentials, studentAnswer, testId, studentInfo);
        
        // If we have existing question text, try to extract structured questions from it
        if (existingQuestionText && !extractedQuestions) {
          console.log("Using existing OCR text to extract questions");
          extractedQuestions = await extractQuestionsFromText(awsCredentials, existingQuestionText);
        }
        
        // If we don't have structured questions yet, process the question paper
        if (!extractedQuestions) {
          console.log("Processing question paper to extract structured questions");
          const { 
            processedDocument: processedQuestionPaper, 
            extractedText: extractedQuestionText,
            questions: extractedQuestionsFromProcess
          } = await processQuestionPaper(
            awsCredentials, 
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
          awsCredentials, 
          answerKey, 
          testId, 
          existingAnswerText
        );
        
        const finalAnswerKeyText = existingAnswerText || extractedAnswerKeyText;
        
        // Perform semantic matching if we have both question paper and student answer
        let matchResults = null;
        if (existingQuestionText && processedStudentAnswer.text) {
          try {
            console.log("Attempting semantic matching of student answers to questions");
            
            matchResults = await matchAnswersToQuestions(
              awsCredentials,
              existingQuestionText,
              processedStudentAnswer.text
            );
            
            console.log(`Found ${matchResults?.matches?.length || 0} potential question-answer matches through semantic matching`);
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
            awsCredentials,
            extractedQuestions,
            finalAnswerKeyText,
            processedStudentAnswer.text,
            studentInfo
          );
        } else {
          console.log("Using standard evaluation flow without extracted questions");
          
          // Fall back to the original evaluation method
          evaluation = await evaluateAnswers(
            awsCredentials,
            testId,
            {text: existingQuestionText},
            {text: finalAnswerKeyText},
            processedStudentAnswer,
            studentInfo
          );
        }
        
        // Add semantic matching results to the evaluation
        if (matchResults && matchResults.matches && matchResults.matches.length > 0) {
          evaluation.semantic_matches = matchResults.matches;
        }
        
        // Process the evaluation results
        return processEvaluation(
          evaluation,
          testId,
          studentAnswer,
          processedStudentAnswer.text,
          existingQuestionText,
          finalAnswerKeyText
        );
      };

      // Race between the processing and the timeout
      const processedEvaluation = await Promise.race([
        processingPromise(),
        requestTimeoutPromise
      ]);
      
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
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
