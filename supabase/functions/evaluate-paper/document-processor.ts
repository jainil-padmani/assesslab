
import { extractTextFromFile, extractTextFromZip, extractQuestionsFromPaper } from './ocr.ts';

/**
 * Adds a cache-busting parameter to a URL to prevent caching issues
 */
export function addCacheBuster(url: string): string {
  if (!url) return url;
  
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}cache=${Date.now()}`;
}

/**
 * Safely extracts the file extension from a URL without query parameters
 */
function getFileExtension(url: string): string {
  if (!url) return '';
  
  // Remove any query parameters
  const urlWithoutParams = url.split('?')[0];
  // Get the last part after the last dot
  return urlWithoutParams.split('.').pop()?.toLowerCase() || '';
}

/**
 * Validates if a file URL points to a supported format
 */
function isValidFileFormat(url: string): boolean {
  const ext = getFileExtension(url);
  const supportedFormats = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
  return supportedFormats.includes(ext);
}

/**
 * Processes a student answer for evaluation
 */
export async function processStudentAnswer(apiKey: string, studentAnswer: any, testId: string, studentInfo: any): Promise<any> {
  try {
    console.log(`Processing student answer for ${studentInfo?.name || 'unknown student'}`);
    
    // Initialize result object
    const result: any = {
      source: "unknown",
      text: ""
    };
    
    // If ZIP URL is available (preferred for batch processing of PNGs)
    if (studentAnswer?.zip_url) {
      console.log(`Processing student answer from ZIP URL: ${studentAnswer.zip_url}`);
      result.source = "zip";
      
      try {
        // Use OCR to extract text from the ZIP file of PNG images
        result.text = await extractTextFromZip(
          studentAnswer.zip_url,
          apiKey,
          "Extract all text from this student answer, preserving numbering and format."
        );
        
        console.log(`Successfully extracted ${result.text.length} characters from student answer ZIP`);
      } catch (zipError) {
        console.error("Error extracting text from ZIP:", zipError);
        
        // If we have direct URL, try that as fallback
        if (studentAnswer?.url) {
          console.log("Falling back to direct URL for student answer");
          result.source = "url_fallback";
          
          // Validate file format before proceeding
          if (!isValidFileFormat(studentAnswer.url)) {
            throw new Error(`Unsupported file format: ${getFileExtension(studentAnswer.url)}. Only PDF and supported image formats (PNG, JPG, JPEG, GIF, WEBP) are allowed.`);
          }
          
          try {
            result.text = await extractTextFromFile(
              studentAnswer.url,
              apiKey,
              "Extract all text from this student answer, preserving numbering and format."
            );
          } catch (fallbackError) {
            console.error("Error with fallback extraction:", fallbackError);
            throw fallbackError;
          }
        } else {
          throw zipError;
        }
      }
    }
    // If only direct URL is available
    else if (studentAnswer?.url) {
      console.log(`Processing student answer from direct URL: ${studentAnswer.url}`);
      result.source = "url";
      
      // Validate file format before proceeding
      if (!isValidFileFormat(studentAnswer.url)) {
        throw new Error(`Unsupported file format: ${getFileExtension(studentAnswer.url)}. Only PDF and supported image formats (PNG, JPG, JPEG, GIF, WEBP) are allowed.`);
      }
      
      try {
        result.text = await extractTextFromFile(
          studentAnswer.url,
          apiKey,
          "Extract all text from this student answer, preserving numbering and format."
        );
        
        console.log(`Successfully extracted ${result.text.length} characters from student answer URL`);
      } catch (urlError) {
        console.error("Error extracting text from URL:", urlError);
        throw urlError;
      }
    }
    // If text is directly provided
    else if (studentAnswer?.text) {
      console.log("Using provided text for student answer");
      result.source = "text";
      result.text = studentAnswer.text;
    }
    else {
      throw new Error("No student answer provided. Please upload an answer sheet.");
    }
    
    return result;
  } catch (error) {
    console.error("Error processing student answer:", error);
    throw error;
  }
}

/**
 * Processes a question paper for evaluation
 */
export async function processQuestionPaper(
  apiKey: string, 
  questionPaper: any, 
  testId: string,
  existingOcrText?: string | null
): Promise<{ 
  processedDocument: any, 
  extractedText: string,
  questions: any[] 
}> {
  try {
    console.log(`Processing question paper for test ID ${testId}`);
    
    // Initialize result
    const result: any = {
      source: "unknown",
      text: ""
    };
    
    let extractedText = existingOcrText || "";
    
    // If we don't have existing OCR text, extract it
    if (!extractedText) {
      // If ZIP URL is available (preferred for PNG batch processing)
      if (questionPaper?.zip_url) {
        console.log(`Processing question paper from ZIP URL: ${questionPaper.zip_url}`);
        result.source = "zip";
        
        try {
          extractedText = await extractTextFromZip(
            questionPaper.zip_url,
            apiKey,
            "Extract all text from this question paper, preserving question numbering and format."
          );
        } catch (zipError) {
          console.error("Error extracting text from ZIP:", zipError);
          
          // Fallback to direct URL if available
          if (questionPaper?.url) {
            console.log("Falling back to direct URL for question paper");
            result.source = "url_fallback";
            
            try {
              extractedText = await extractTextFromFile(
                questionPaper.url,
                apiKey,
                "Extract all text from this question paper, preserving question numbering and format."
              );
            } catch (fallbackError) {
              console.error("Error with fallback extraction:", fallbackError);
              throw fallbackError;
            }
          } else {
            throw zipError;
          }
        }
      }
      // If only direct URL is available
      else if (questionPaper?.url) {
        console.log(`Processing question paper from direct URL: ${questionPaper.url}`);
        result.source = "url";
        
        try {
          extractedText = await extractTextFromFile(
            questionPaper.url,
            apiKey,
            "Extract all text from this question paper, preserving question numbering and format."
          );
        } catch (urlError) {
          console.error("Error extracting text from URL:", urlError);
          throw urlError;
        }
      }
      // If text is directly provided
      else if (questionPaper?.text) {
        console.log("Using provided text for question paper");
        result.source = "text";
        extractedText = questionPaper.text;
      }
      else {
        throw new Error("No question paper provided.");
      }
    } else {
      console.log("Using existing OCR text for question paper");
      result.source = "existing_ocr";
    }
    
    result.text = extractedText;
    
    // Extract structured questions from the question paper text
    console.log("Extracting structured questions from question paper");
    let extractedQuestions: any[] = [];
    
    try {
      const questionExtraction = await extractQuestionsFromPaper(
        questionPaper?.url || "",
        apiKey,
        extractedText
      );
      
      extractedQuestions = questionExtraction.questions || [];
      console.log(`Extracted ${extractedQuestions.length} questions from question paper`);
    } catch (extractionError) {
      console.error("Error extracting questions:", extractionError);
      extractedQuestions = [];
    }
    
    return { 
      processedDocument: result, 
      extractedText: extractedText,
      questions: extractedQuestions
    };
  } catch (error) {
    console.error("Error processing question paper:", error);
    throw error;
  }
}

/**
 * Processes an answer key for evaluation
 */
export async function processAnswerKey(
  apiKey: string, 
  answerKey: any, 
  testId: string,
  existingOcrText?: string | null
): Promise<{ 
  processedDocument: any, 
  extractedText: string 
}> {
  try {
    console.log(`Processing answer key for test ID ${testId}`);
    
    // Initialize result
    const result: any = {
      source: "unknown",
      text: ""
    };
    
    let extractedText = existingOcrText || "";
    
    // If we don't have existing OCR text, extract it
    if (!extractedText) {
      // If ZIP URL is available (preferred for PNG batch processing)
      if (answerKey?.zip_url) {
        console.log(`Processing answer key from ZIP URL: ${answerKey.zip_url}`);
        result.source = "zip";
        
        try {
          extractedText = await extractTextFromZip(
            answerKey.zip_url,
            apiKey,
            "Extract all text from this answer key, preserving answer numbering and format."
          );
        } catch (zipError) {
          console.error("Error extracting text from ZIP:", zipError);
          
          // Fallback to direct URL if available
          if (answerKey?.url) {
            console.log("Falling back to direct URL for answer key");
            result.source = "url_fallback";
            
            try {
              extractedText = await extractTextFromFile(
                answerKey.url,
                apiKey,
                "Extract all text from this answer key, preserving answer numbering and format."
              );
            } catch (fallbackError) {
              console.error("Error with fallback extraction:", fallbackError);
              throw fallbackError;
            }
          } else {
            throw zipError;
          }
        }
      }
      // If only direct URL is available
      else if (answerKey?.url) {
        console.log(`Processing answer key from direct URL: ${answerKey.url}`);
        result.source = "url";
        
        try {
          extractedText = await extractTextFromFile(
            answerKey.url,
            apiKey,
            "Extract all text from this answer key, preserving answer numbering and format."
          );
        } catch (urlError) {
          console.error("Error extracting text from URL:", urlError);
          throw urlError;
        }
      }
      // If text is directly provided
      else if (answerKey?.text) {
        console.log("Using provided text for answer key");
        result.source = "text";
        extractedText = answerKey.text;
      }
      else {
        // Answer key might be optional in some cases
        console.log("No answer key provided. Evaluation will be based solely on the question paper.");
        result.source = "none";
        extractedText = "";
      }
    } else {
      console.log("Using existing OCR text for answer key");
      result.source = "existing_ocr";
    }
    
    result.text = extractedText;
    
    return { 
      processedDocument: result, 
      extractedText: extractedText 
    };
  } catch (error) {
    console.error("Error processing answer key:", error);
    throw error;
  }
}

/**
 * Process an evaluation result for returning to client
 */
export function processEvaluation(
  evaluation: any,
  testId: string,
  studentAnswer: any,
  studentAnswerText: string,
  questionPaperText: string,
  answerKeyText: string
): any {
  // Add extracted text to the evaluation for future reference
  const processedEvaluation = {
    ...evaluation,
    testId,
    text: studentAnswerText,
    questionPaper: questionPaperText,
    answerKey: answerKeyText,
    processed_at: new Date().toISOString()
  };
  
  return processedEvaluation;
}
