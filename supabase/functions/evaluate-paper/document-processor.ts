import { Prompts } from './prompts.ts';
import { 
  extractTextFromFile, 
  extractTextFromZip,
  extractQuestionsFromPaper,
  evaluateWithExtractedQuestions
} from './ocr.ts';

// Add cache-busting parameter to URL
export function addCacheBuster(url: string): string {
  const cacheBuster = `cache=${Date.now()}`;
  return url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;
}

// Process the student's answer sheet
export async function processStudentAnswer(
  apiKey: string,
  studentAnswer: any,
  testId: string,
  studentInfo: any
): Promise<any> {
  try {
    console.log(`Processing student answer for test ID ${testId} and student ${studentInfo?.name || 'Unknown'}`);
    
    // If text is already provided, use it
    if (studentAnswer?.text) {
      console.log("Using provided text for student answers");
      return studentAnswer;
    }
    
    // If URL is provided, extract text
    if (studentAnswer?.url) {
      console.log(`Extracting text from student answer URL: ${studentAnswer.url}`);
      
      // Check if a ZIP url is provided (multi-page)
      if (studentAnswer?.zip_url) {
        console.log(`Using ZIP URL for student answer: ${studentAnswer.zip_url}`);
        const extractedText = await extractTextFromZip(
          studentAnswer.zip_url,
          apiKey,
          Prompts.answerSheet
        );
        
        return {
          ...studentAnswer,
          text: extractedText
        };
      } else {
        // Otherwise process as a single file
        const extractedText = await extractTextFromFile(
          studentAnswer.url,
          apiKey,
          Prompts.answerSheet
        );
        
        return {
          ...studentAnswer,
          text: extractedText
        };
      }
    }
    
    throw new Error("No student answer text or URL provided");
  } catch (error) {
    console.error("Error processing student answer:", error);
    throw error;
  }
}

// Process the question paper with OCR to extract questions
export async function processQuestionPaper(
  apiKey: string,
  questionPaper: any,
  testId: string
): Promise<{ processedDocument: any, extractedText: string | null, questions?: any }> {
  try {
    console.log(`Processing question paper for test ID ${testId}`);
    
    // If text is already provided, use it
    if (questionPaper?.text) {
      console.log("Using provided text for question paper");
      return { 
        processedDocument: questionPaper, 
        extractedText: questionPaper.text 
      };
    }
    
    // If URL is provided, extract text and questions
    if (questionPaper?.url) {
      console.log(`Extracting text from question paper URL: ${questionPaper.url}`);
      
      let extractedText: string;
      
      // Check if a ZIP url is available (multi-page)
      if (questionPaper?.zip_url) {
        console.log(`Using ZIP URL for question paper: ${questionPaper.zip_url}`);
        extractedText = await extractTextFromZip(
          questionPaper.zip_url,
          apiKey,
          Prompts.questionPaper
        );
      } else {
        // Otherwise process as a single file
        extractedText = await extractTextFromFile(
          questionPaper.url,
          apiKey,
          Prompts.questionPaper
        );
      }
      
      // Extract structured questions from the question paper
      console.log("Extracting structured questions from question paper text");
      const urlToUse = questionPaper?.zip_url || questionPaper.url;
      const extractedQuestions = await extractQuestionsFromPaper(
        urlToUse,
        apiKey
      );
      
      return {
        processedDocument: {
          ...questionPaper,
          text: extractedText
        }, 
        extractedText,
        questions: extractedQuestions.questions
      };
    }
    
    throw new Error("No question paper text or URL provided");
  } catch (error) {
    console.error("Error processing question paper:", error);
    // Continue without extracted questions if this fails
    if (questionPaper?.url) {
      return { 
        processedDocument: questionPaper, 
        extractedText: null 
      };
    }
    throw error;
  }
}

// Process the answer key
export async function processAnswerKey(
  apiKey: string,
  answerKey: any,
  testId: string
): Promise<{ processedDocument: any, extractedText: string | null }> {
  try {
    console.log(`Processing answer key for test ID ${testId}`);
    
    // If no answer key is provided, return null (we'll use LLM-only evaluation)
    if (!answerKey) {
      console.log("No answer key provided, will use LLM-only evaluation");
      return { 
        processedDocument: null, 
        extractedText: null 
      };
    }
    
    // If text is already provided, use it
    if (answerKey?.text) {
      console.log("Using provided text for answer key");
      return { 
        processedDocument: answerKey, 
        extractedText: answerKey.text 
      };
    }
    
    // If URL is provided, extract text
    if (answerKey?.url) {
      console.log(`Extracting text from answer key URL: ${answerKey.url}`);
      
      // Check if a ZIP url is available (multi-page)
      if (answerKey?.zip_url) {
        console.log(`Using ZIP URL for answer key: ${answerKey.zip_url}`);
        const extractedText = await extractTextFromZip(
          answerKey.zip_url,
          apiKey,
          Prompts.answerKey
        );
        
        return {
          processedDocument: {
            ...answerKey,
            text: extractedText
          }, 
          extractedText
        };
      } else {
        // Otherwise process as a single file
        const extractedText = await extractTextFromFile(
          answerKey.url,
          apiKey,
          Prompts.answerKey
        );
        
        return {
          processedDocument: {
            ...answerKey,
            text: extractedText
          }, 
          extractedText
        };
      }
    }
    
    // If we have a topic but no URL or text, return the topic for LLM-based evaluation
    if (answerKey?.topic) {
      console.log(`Using topic for answer key: ${answerKey.topic}`);
      return { 
        processedDocument: answerKey, 
        extractedText: null 
      };
    }
    
    // No answer key information available
    console.log("No answer key information provided, will use LLM-only evaluation");
    return { 
      processedDocument: null, 
      extractedText: null 
    };
  } catch (error) {
    console.error("Error processing answer key:", error);
    // Continue without answer key if this fails
    if (answerKey?.url || answerKey?.topic) {
      return { 
        processedDocument: answerKey, 
        extractedText: null 
      };
    }
    return { 
      processedDocument: null, 
      extractedText: null 
    };
  }
}
