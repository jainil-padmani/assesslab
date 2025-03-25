
// Import necessary modules and functions
import { extractTextFromFile, extractTextFromZip, extractQuestionsFromPaper } from './ocr.ts';

/**
 * Processes a student's answer sheet document
 * Now works with direct UploadThing URLs
 */
export async function processStudentAnswer(
  apiKey: string,
  studentAnswer: any,
  testId: string,
  studentInfo: any
): Promise<{ text: string }> {
  try {
    console.log("Processing student answer document");
    
    // If the student provided text directly, use that
    if (studentAnswer.text) {
      console.log("Using student-provided text answer");
      return { 
        text: studentAnswer.text 
      };
    }
    
    // With UploadThing we handle URLs directly for all file types
    if (studentAnswer.url) {
      console.log("Processing student answer from URL:", studentAnswer.url);
      
      // Helper to add cache buster to URL
      const urlWithCacheBuster = addCacheBuster(studentAnswer.url);
      
      // Process with appropriate system prompt
      const extractedText = await extractTextFromFile(
        urlWithCacheBuster,
        apiKey,
        "You are an OCR tool optimized for extracting text from student answer sheets. Extract all text content accurately, preserving paragraph structure and formatting. Focus on academic content, math equations, and written responses."
      );
      
      console.log(`Successfully extracted ${extractedText.length} characters from student answer URL`);
      return { text: extractedText };
    }
    
    // If we reached here, there's no text source available
    throw new Error("No valid text source found for student answer. Need either text or URL.");
  } catch (error) {
    console.error("Error processing student answer:", error);
    throw error;
  }
}

/**
 * Processes a question paper document
 * Works with UploadThing URLs
 */
export async function processQuestionPaper(
  apiKey: string,
  questionPaper: any,
  testId: string,
  existingText: string | null = null
): Promise<{ processedDocument: any, extractedText: string, questions: any[] }> {
  try {
    console.log("Processing question paper document");
    
    // If we already have OCR text, use that
    if (existingText) {
      console.log("Using existing OCR text for question paper");
      
      // Extract structured questions from the existing text
      const extractedQuestions = await extractQuestionsFromPaper(
        questionPaper.url || '', 
        apiKey, 
        existingText
      );
      
      return {
        processedDocument: { text: existingText },
        extractedText: existingText,
        questions: extractedQuestions.questions || []
      };
    }
    
    // Check if we have a URL to process
    if (!questionPaper.url) {
      throw new Error("No URL provided for question paper");
    }
    
    console.log("Extracting text from question paper URL:", questionPaper.url);
    
    // Add cache buster to URL
    const urlWithCacheBuster = addCacheBuster(questionPaper.url);
    
    // Extract text from the document
    const extractedText = await extractTextFromFile(
      urlWithCacheBuster,
      apiKey,
      "You are an OCR tool optimized for extracting text from question papers. Extract all text content accurately, preserving paragraph structure, numbering, and formatting. Pay special attention to question numbers, section headings, and instructions."
    );
    
    console.log(`Successfully extracted ${extractedText.length} characters from question paper`);
    
    // Extract structured questions from the extracted text
    const extractedQuestions = await extractQuestionsFromPaper(
      questionPaper.url, 
      apiKey, 
      extractedText
    );
    
    console.log(`Extracted ${extractedQuestions.questions?.length || 0} structured questions`);
    
    return {
      processedDocument: { text: extractedText },
      extractedText,
      questions: extractedQuestions.questions || []
    };
  } catch (error) {
    console.error("Error processing question paper:", error);
    throw error;
  }
}

/**
 * Processes an answer key document
 * Works with UploadThing URLs
 */
export async function processAnswerKey(
  apiKey: string,
  answerKey: any,
  testId: string,
  existingText: string | null = null
): Promise<{ processedDocument: any, extractedText: string }> {
  try {
    console.log("Processing answer key document");
    
    // If we already have OCR text, use that
    if (existingText) {
      console.log("Using existing OCR text for answer key");
      return {
        processedDocument: { text: existingText },
        extractedText: existingText
      };
    }
    
    // Check if we have a URL to process
    if (!answerKey.url) {
      throw new Error("No URL provided for answer key");
    }
    
    console.log("Extracting text from answer key URL:", answerKey.url);
    
    // Add cache buster to URL
    const urlWithCacheBuster = addCacheBuster(answerKey.url);
    
    // Extract text from the document
    const extractedText = await extractTextFromFile(
      urlWithCacheBuster,
      apiKey,
      "You are an OCR tool optimized for extracting text from answer keys. Extract all text content accurately, preserving paragraph structure, numbering, and formatting. Pay special attention to answer numbers and correct responses."
    );
    
    console.log(`Successfully extracted ${extractedText.length} characters from answer key`);
    
    return {
      processedDocument: { text: extractedText },
      extractedText
    };
  } catch (error) {
    console.error("Error processing answer key:", error);
    throw error;
  }
}

/**
 * Add a cache-busting parameter to URLs to prevent caching issues
 */
export function addCacheBuster(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}cache=${Date.now()}`;
}
