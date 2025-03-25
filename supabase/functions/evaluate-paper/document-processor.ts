
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
  const cacheBuster = `cache=${Date.now()}`;
  return url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;
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
        extractedStudentText = await extractTextFromZip(
          addCacheBuster(studentAnswer.zip_url),
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
        extractedStudentText = "Error processing ZIP file: " + zipError.message;
        
        processedStudentAnswer = {
          ...studentAnswer,
          text: `Error processing ZIP file: ${zipError.message}`,
          isOcrProcessed: false,
          zipProcessed: false,
          ocrError: zipError.message
        };
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
          
          extractedStudentText = await extractTextFromFile(
            addCacheBuster(studentAnswer.url),
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
        
        extractedQuestionText = await extractTextFromFile(
          addCacheBuster(questionPaper.url),
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
        
        extractedAnswerKeyText = await extractTextFromFile(
          addCacheBuster(answerKey.url),
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
