
import { extractTextFromFile, extractTextFromImageFile, extractQuestionsFromPaper } from "./ocr.ts";
import { getDocumentPagesAsImages } from "./services/document-converter.ts";

/**
 * Add a cache busting parameter to a URL
 */
export function addCacheBuster(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}cache=${Date.now()}`;
}

/**
 * Strip query parameters from a URL
 */
export function stripQueryParams(url: string): string {
  return url.split('?')[0];
}

/**
 * Process a student answer document to extract text
 * Always converts PDFs to images first for better OCR processing
 */
export async function processStudentAnswer(
  credentials: { accessKeyId: string, secretAccessKey: string, region: string },
  studentAnswer: any,
  testId: string,
  studentInfo: any
): Promise<any> {
  console.log("Processing student answer for test:", testId);
  
  if (!studentAnswer) {
    console.log("No student answer provided");
    return { text: null };
  }
  
  // If text is already provided, use it directly
  if (studentAnswer.text) {
    console.log("Using provided student answer text");
    return studentAnswer;
  }
  
  try {
    let extractedText = "";
    let imageUrlsForProcessing: string[] = [];
    
    // Check if we need to convert PDF to images - always do this for PDFs
    if (studentAnswer.url && (
      studentAnswer.url.toLowerCase().endsWith('.pdf') || 
      (studentAnswer.content_type && studentAnswer.content_type.includes('pdf'))
    )) {
      console.log("PDF document detected, converting to images first");
      imageUrlsForProcessing = await getDocumentPagesAsImages(studentAnswer.url);
      
      if (imageUrlsForProcessing && imageUrlsForProcessing.length > 0) {
        console.log(`Converted PDF to ${imageUrlsForProcessing.length} images`);
        
        // Process images in batches of 4 (Claude's limit)
        extractedText = await extractTextFromImageFile(
          JSON.stringify(imageUrlsForProcessing),
          credentials,
          `You are an OCR expert optimized for extracting handwritten answers from student exam sheets. Carefully identify all text, preserve formatting and structure. Focus on identifying sections of text that answer specific questions.`,
          `Extract all text from these converted PDF images for ${studentInfo?.name || 'a student'}.`
        );
        
        if (extractedText) {
          console.log("Successfully extracted student answer text from converted PDF");
          return { 
            text: extractedText,
            url: studentAnswer.url,
            processed: true
          };
        }
      }
    }
    
    // Try using the ZIP URL if available - this contains optimized images
    if (studentAnswer.zip_url) {
      console.log("Processing student answer from images URL:", studentAnswer.clean_zip_url || studentAnswer.zip_url);
      
      try {
        // Get image URLs from the zip URL (already optimized images)
        imageUrlsForProcessing = Array.isArray(studentAnswer.clean_zip_url || studentAnswer.zip_url) 
          ? studentAnswer.clean_zip_url || studentAnswer.zip_url
          : [studentAnswer.clean_zip_url || studentAnswer.zip_url];
          
        console.log(`Processing ${imageUrlsForProcessing.length} images from zip URL`);
        
        extractedText = await extractTextFromImageFile(
          JSON.stringify(imageUrlsForProcessing),
          credentials, 
          `You are an OCR expert optimized for extracting handwritten answers from student exam sheets. Carefully identify all text, preserve formatting and structure. Focus on identifying sections of text that answer specific questions.`
        );
        
        if (extractedText) {
          console.log("Successfully extracted student answer text from images");
          return { 
            text: extractedText,
            url: studentAnswer.url,
            processed: true
          };
        }
      } catch (zipError) {
        console.error("Error processing images:", zipError);
        // Fall back to direct URL processing
      }
    }
    
    // Fall back to using the direct URL (but convert PDFs first)
    if (studentAnswer.url) {
      console.log("Falling back to processing student answer from direct URL");
      
      // For non-PDFs, we can use the direct URL
      if (!studentAnswer.url.toLowerCase().endsWith('.pdf') && 
          !(studentAnswer.content_type && studentAnswer.content_type.includes('pdf'))) {
        
        extractedText = await extractTextFromFile(
          studentAnswer.url,
          credentials,
          `You are an OCR expert optimized for extracting handwritten answers from student exam sheets. Carefully identify all text, preserve formatting and structure. Focus on identifying sections of text that answer specific questions.`,
          `Extract all text from this student's answer sheet for ${studentInfo?.name || 'a student'}.`
        );
        
        if (extractedText) {
          console.log("Successfully extracted student answer text from URL");
          return { 
            text: extractedText,
            url: studentAnswer.url,
            processed: true
          };
        }
      }
    }
    
    console.warn("Failed to extract text from student answer");
    return { text: null };
  } catch (error) {
    console.error("Error processing student answer:", error);
    throw new Error(`Failed to process student answer: ${error.message}`);
  }
}

/**
 * Process a question paper document to extract text and questions
 * Always converts PDFs to images first for better OCR processing
 */
export async function processQuestionPaper(
  credentials: { accessKeyId: string, secretAccessKey: string, region: string },
  questionPaper: any,
  testId: string,
  existingText: string | null
): Promise<any> {
  console.log("Processing question paper for test:", testId);
  
  if (!questionPaper) {
    console.log("No question paper provided");
    return { 
      processedDocument: { text: null },
      extractedText: null,
      questions: [] 
    };
  }
  
  try {
    let extractedText = existingText || "";
    let imageUrlsForProcessing: string[] = [];
    
    // Extract text from the question paper URL if text is not already provided
    if (!extractedText && questionPaper.url) {
      console.log("Extracting text from question paper URL");
      
      // Always convert PDFs to images first for better OCR
      if (questionPaper.url.toLowerCase().endsWith('.pdf') || 
         (questionPaper.content_type && questionPaper.content_type.includes('pdf'))) {
        console.log("PDF question paper detected, converting to images first");
        imageUrlsForProcessing = await getDocumentPagesAsImages(questionPaper.url);
        
        if (imageUrlsForProcessing && imageUrlsForProcessing.length > 0) {
          console.log(`Converted PDF to ${imageUrlsForProcessing.length} images for OCR processing`);
          
          // Process images in batches of 4 (Claude's limit)
          extractedText = await extractTextFromImageFile(
            JSON.stringify(imageUrlsForProcessing),
            credentials,
            `You are an OCR expert specialized in extracting text from exam question papers. Identify question numbers, section headers, and all text content accurately. Preserve the formatting and structure of the original document.`,
            `Extract all text from these question paper images with special focus on identifying question numbers and their corresponding text.`
          );
        }
      } else {
        // For non-PDFs, we can process the image directly
        extractedText = await extractTextFromFile(
          questionPaper.url,
          credentials,
          `You are an OCR expert specialized in extracting text from exam question papers. Identify question numbers, section headers, and all text content accurately. Preserve the formatting and structure of the original document.`,
          `Extract all text from this question paper with special focus on identifying question numbers and their corresponding text.`
        );
      }
      
      console.log("Extracted question paper text:", extractedText?.substring(0, 100) + "...");
    }
    
    // Extract structured questions from the text
    console.log("Extracting structured questions from question paper");
    const { questions } = await extractQuestionsFromPaper(
      imageUrlsForProcessing.length > 0 ? JSON.stringify(imageUrlsForProcessing) : questionPaper.url,
      credentials,
      extractedText
    );
    
    console.log(`Extracted ${questions.length} questions from paper`);
    
    return {
      processedDocument: { text: extractedText, url: questionPaper.url },
      extractedText,
      questions
    };
  } catch (error) {
    console.error("Error processing question paper:", error);
    throw new Error(`Failed to process question paper: ${error.message}`);
  }
}

/**
 * Process an answer key document to extract text
 * Always converts PDFs to images first for better OCR processing
 */
export async function processAnswerKey(
  credentials: { accessKeyId: string, secretAccessKey: string, region: string },
  answerKey: any,
  testId: string,
  existingText: string | null
): Promise<any> {
  console.log("Processing answer key for test:", testId);
  
  if (!answerKey) {
    console.log("No answer key provided");
    return { 
      processedDocument: { text: null },
      extractedText: null 
    };
  }
  
  try {
    let extractedText = existingText || "";
    let imageUrlsForProcessing: string[] = [];
    
    // Extract text from the answer key URL if text is not already provided
    if (!extractedText && answerKey.url) {
      console.log("Extracting text from answer key URL");
      
      // Always convert PDFs to images first for better OCR
      if (answerKey.url.toLowerCase().endsWith('.pdf') || 
         (answerKey.content_type && answerKey.content_type.includes('pdf'))) {
        console.log("PDF answer key detected, converting to images first");
        imageUrlsForProcessing = await getDocumentPagesAsImages(answerKey.url);
        
        if (imageUrlsForProcessing && imageUrlsForProcessing.length > 0) {
          console.log(`Converted PDF to ${imageUrlsForProcessing.length} images for OCR processing`);
          
          // Process images in batches of 4 (Claude's limit)
          extractedText = await extractTextFromImageFile(
            JSON.stringify(imageUrlsForProcessing),
            credentials,
            `You are an OCR expert specialized in extracting text from answer keys. Identify all answer content accurately, including question numbers and their corresponding answers. Preserve the formatting and structure.`,
            `Extract all text from these answer key images with special focus on correct answers for each question.`
          );
        }
      } else {
        // For non-PDFs, we can process the image directly
        extractedText = await extractTextFromFile(
          answerKey.url,
          credentials,
          `You are an OCR expert specialized in extracting text from answer keys. Identify all answer content accurately, including question numbers and their corresponding answers. Preserve the formatting and structure.`,
          `Extract all text from this answer key document with special focus on correct answers for each question.`
        );
      }
      
      console.log("Extracted answer key text:", extractedText?.substring(0, 100) + "...");
    }
    
    return {
      processedDocument: { text: extractedText, url: answerKey.url },
      extractedText
    };
  } catch (error) {
    console.error("Error processing answer key:", error);
    throw new Error(`Failed to process answer key: ${error.message}`);
  }
}
