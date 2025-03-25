
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { extractTextFromZip, extractTextFromFile } from './ocr.ts';
import { Prompts } from './prompts.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocumentInfo {
  url: string;
  zip_url?: string;
  topic?: string;
  text?: string;
  isOcrProcessed?: boolean;
  zipProcessed?: boolean;
  ocrError?: string;
}

/**
 * Helper to add cache-busting parameters to URLs
 */
export function addCacheBuster(url: string): string {
  if (!url) return url;
  // Remove any existing cache busters to prevent URL growing too long
  let cleanUrl = url;
  if (url.includes('?cache=')) {
    cleanUrl = url.substring(0, url.indexOf('?cache='));
  } else if (url.includes('&cache=')) {
    const cacheBusterStart = url.indexOf('&cache=');
    cleanUrl = url.substring(0, cacheBusterStart) + url.substring(url.indexOf('&', cacheBusterStart + 1) || url.length);
  }
  
  const cacheBuster = `cache=${Date.now()}`;
  return cleanUrl.includes('?') ? `${cleanUrl}&${cacheBuster}` : `${cleanUrl}?${cacheBuster}`;
}

/**
 * Attempts to download a file with retries
 * @param url The URL to download
 * @param maxRetries Maximum number of retry attempts
 * @returns The downloaded response or throws after max retries
 */
async function downloadWithRetry(url: string, maxRetries = 3): Promise<Response> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Increase timeout for each retry attempt
      const timeout = attempt * 15000; // 15s, 30s, 45s
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      console.log(`Download attempt ${attempt} for ${url} with timeout ${timeout}ms`);
      
      // Try to download with current timeout
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      console.log(`Successfully downloaded from ${url} on attempt ${attempt}`);
      return response;
    } catch (error) {
      lastError = error;
      console.warn(`Download attempt ${attempt} failed for ${url}: ${error.message}`);
      
      if (error.name === 'AbortError') {
        console.warn(`Request timed out on attempt ${attempt}`);
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw new Error(`Failed to download after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`Waiting ${delay}ms before retry ${attempt + 1}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Process the student answer sheet document
 */
export async function processStudentAnswer(
  apiKey: string,
  studentAnswer: DocumentInfo,
  testId: string,
  studentInfo: any
): Promise<DocumentInfo> {
  try {
    let processedStudentAnswer = { ...studentAnswer };
    let extractedStudentText = null;
    
    // If a ZIP URL is available, prefer that for better quality OCR
    if (studentAnswer?.zip_url) {
      console.log("Found ZIP URL for enhanced OCR processing:", studentAnswer.zip_url);
      
      try {
        const cacheBustedUrl = addCacheBuster(studentAnswer.zip_url);
        console.log("Processing ZIP with cache buster:", cacheBustedUrl);
        
        extractedStudentText = await extractTextFromZip(
          cacheBustedUrl,
          apiKey,
          Prompts.answerSheet
        );
        
        // Update the student answer with OCR text
        processedStudentAnswer = {
          ...studentAnswer,
          text: extractedStudentText,
          isOcrProcessed: true,
          testId: testId,
          zipProcessed: true
        };
      } catch (zipError) {
        console.error("Error processing ZIP file:", zipError);
        
        // Try fallback to direct image URL if available
        if (studentAnswer?.url) {
          console.log("Trying fallback to direct image URL after ZIP processing failure");
          
          try {
            const userPrompt = `This is a student's answer sheet for test ID: ${testId}. The ZIP processing failed, so we're trying direct image processing. Extract all the text, focusing on identifying question numbers and their corresponding answers:`;
            
            extractedStudentText = await extractTextFromFile(
              addCacheBuster(studentAnswer.url),
              apiKey, 
              Prompts.answerSheet,
              userPrompt
            );
            
            processedStudentAnswer = {
              ...studentAnswer,
              text: extractedStudentText,
              isOcrProcessed: true,
              zipProcessed: false,
              testId: testId
            };
          } catch (fallbackError) {
            console.error("Fallback OCR also failed:", fallbackError);
            
            processedStudentAnswer = {
              ...studentAnswer,
              text: `Could not extract text from answer sheet. We tried both ZIP and direct processing methods. Error: ${zipError.message}. Fallback error: ${fallbackError.message}`,
              isOcrProcessed: false,
              zipProcessed: false,
              ocrError: `${zipError.message}. Fallback error: ${fallbackError.message}`
            };
          }
        } else {
          processedStudentAnswer = {
            ...studentAnswer,
            text: "Error processing ZIP file. Technical details: " + zipError.message,
            isOcrProcessed: false,
            zipProcessed: false,
            ocrError: zipError.message
          };
        }
      }
    } 
    // Process PDF or image files directly if no ZIP is available
    else if (studentAnswer?.url && (
        studentAnswer.url.includes('.jpg') || 
        studentAnswer.url.includes('.jpeg') || 
        studentAnswer.url.includes('.png') ||
        studentAnswer.url.includes('.pdf')
    )) {
      console.log("Detected document/image answer sheet, performing OCR with GPT-4o...");
      console.log("URL:", studentAnswer.url);
      
      try {
        // For PDFs, provide a recommendation about using ZIP processing
        if (studentAnswer.url.includes('.pdf')) {
          console.log("PDF detected. For better results, please use ZIP processing path.");
          extractedStudentText = "PDF detected. For better results, please regenerate the assessment to use enhanced OCR via ZIP processing.";
          processedStudentAnswer = {
            ...studentAnswer,
            text: extractedStudentText,
            isOcrProcessed: false
          };
        } else {
          // For direct image processing (JPEG, PNG)
          const userPrompt = `This is a student's answer sheet for test ID: ${testId}. Extract all the text, focusing on identifying question numbers and their corresponding answers:`;
          
          const cacheBustedUrl = addCacheBuster(studentAnswer.url);
          console.log("Processing direct image with cache buster:", cacheBustedUrl);
          
          extractedStudentText = await extractTextFromFile(
            cacheBustedUrl,
            apiKey, 
            Prompts.answerSheet,
            userPrompt
          );
          
          // Update the student answer with OCR text
          processedStudentAnswer = {
            ...studentAnswer,
            text: extractedStudentText,
            isOcrProcessed: true,
            testId: testId
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
    
    // Update the database with extracted text if available
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
          .from('test_answers')
          .update({ text_content: extractedStudentText })
          .eq('student_id', studentInfo.id)
          .eq('test_id', testId);
          
        if (error) {
          console.error("Error updating test_answers with extracted text:", error);
        } else {
          console.log("Successfully updated test_answers with extracted text");
        }
      } catch (dbError) {
        console.error("Error connecting to database:", dbError);
      }
    }
    
    return processedStudentAnswer;
  } catch (error) {
    console.error("Error processing student answer:", error);
    return { 
      ...studentAnswer,
      text: "Error processing document: " + error.message,
      isOcrProcessed: false,
      ocrError: error.message
    };
  }
}

/**
 * Process the question paper document
 */
export async function processQuestionPaper(
  apiKey: string,
  questionPaper: DocumentInfo,
  testId: string
): Promise<{ processedDocument: DocumentInfo, extractedText: string | null }> {
  try {
    let processedQuestionPaper = { ...questionPaper };
    let extractedQuestionText = null;
    
    if (questionPaper?.url && (
        questionPaper.url.includes('.pdf') ||
        questionPaper.url.includes('.jpg') || 
        questionPaper.url.includes('.jpeg') || 
        questionPaper.url.includes('.png')
    )) {
      console.log("Processing question paper for text extraction:", questionPaper.url);
      
      try {
        const userPrompt = `This is a question paper for test ID: ${testId}. Extract all the text, focusing on identifying question numbers and their content:`;
        
        const cacheBustedUrl = addCacheBuster(questionPaper.url);
        console.log("Processing question paper with cache buster:", cacheBustedUrl);
        
        extractedQuestionText = await extractTextFromFile(
          cacheBustedUrl,
          apiKey, 
          Prompts.questionPaper,
          userPrompt
        );
        
        processedQuestionPaper = {
          ...questionPaper,
          text: extractedQuestionText,
          isOcrProcessed: true
        };
      } catch (ocrError) {
        console.error("Error during question paper OCR processing:", ocrError);
        
        processedQuestionPaper = {
          ...questionPaper,
          text: "Error processing question paper document.",
          isOcrProcessed: false,
          ocrError: ocrError.message
        };
      }
    }
    
    return { 
      processedDocument: processedQuestionPaper, 
      extractedText: extractedQuestionText 
    };
  } catch (error) {
    console.error("Error processing question paper:", error);
    return { 
      processedDocument: {
        ...questionPaper,
        text: "Error processing document: " + error.message,
        isOcrProcessed: false,
        ocrError: error.message
      }, 
      extractedText: null 
    };
  }
}

/**
 * Process the answer key document
 */
export async function processAnswerKey(
  apiKey: string,
  answerKey: DocumentInfo,
  testId: string
): Promise<{ processedDocument: DocumentInfo, extractedText: string | null }> {
  try {
    let processedAnswerKey = { ...answerKey };
    let extractedAnswerKeyText = null;
    
    if (answerKey?.url && (
        answerKey.url.includes('.pdf') ||
        answerKey.url.includes('.jpg') || 
        answerKey.url.includes('.jpeg') || 
        answerKey.url.includes('.png')
    )) {
      console.log("Processing answer key for text extraction:", answerKey.url);
      
      try {
        const userPrompt = `This is an answer key for test ID: ${testId}. Extract all the text, focusing on identifying question numbers and their corresponding answers:`;
        
        const cacheBustedUrl = addCacheBuster(answerKey.url);
        console.log("Processing answer key with cache buster:", cacheBustedUrl);
        
        extractedAnswerKeyText = await extractTextFromFile(
          cacheBustedUrl,
          apiKey, 
          Prompts.answerKey,
          userPrompt
        );
        
        processedAnswerKey = {
          ...answerKey,
          text: extractedAnswerKeyText,
          isOcrProcessed: true
        };
      } catch (ocrError) {
        console.error("Error during answer key OCR processing:", ocrError);
        
        processedAnswerKey = {
          ...answerKey,
          text: "Error processing answer key document.",
          isOcrProcessed: false,
          ocrError: ocrError.message
        };
      }
    }
    
    return { 
      processedDocument: processedAnswerKey, 
      extractedText: extractedAnswerKeyText 
    };
  } catch (error) {
    console.error("Error processing answer key:", error);
    return { 
      processedDocument: {
        ...answerKey, 
        text: "Error processing document: " + error.message,
        isOcrProcessed: false,
        ocrError: error.message
      }, 
      extractedText: null 
    };
  }
}
