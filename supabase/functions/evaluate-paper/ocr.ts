
import { Prompts } from './prompts.ts';

/**
 * Extract text from a file using OCR via the OpenAI API
 */
async function extractTextFromFile(
  fileUrl: string,
  apiKey: string,
  systemPrompt: string
): Promise<string> {
  try {
    console.log(`Extracting text from file: ${fileUrl}`);
    
    // Extract file extension without query parameters
    const urlWithoutParams = fileUrl.split('?')[0];
    const fileExtension = urlWithoutParams.split('.').pop()?.toLowerCase();
    
    const supportedImageFormats = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    const isPdf = fileExtension === 'pdf';
    const isValidImageFormat = supportedImageFormats.includes(fileExtension || '');
    
    if (!isPdf && !isValidImageFormat) {
      throw new Error(`Unsupported file format: ${fileExtension}. Only PDF and supported image formats (PNG, JPG, JPEG, GIF, WEBP) are allowed.`);
    }
    
    // Call the OpenAI API for vision OCR
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: systemPrompt
          },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: 'Extract all text from this document:' },
              { 
                type: 'image_url', 
                image_url: {
                  url: fileUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", JSON.stringify(errorData));
      
      // Check for specific error types and provide more descriptive errors
      if (errorData.error?.code === 'invalid_image_format') {
        throw new Error(`OCR extraction failed: The image format is not supported. Please upload PNG, JPEG, GIF, or WEBP files.`);
      } else if (errorData.error?.message?.includes('unsupported image')) {
        throw new Error(`OCR extraction failed: ${errorData.error.message}`);
      } else {
        throw new Error(`OCR extraction failed: ${JSON.stringify(errorData)}`);
      }
    }
    
    const data = await response.json();
    const extractedText = data.choices[0].message.content;
    
    console.log(`Successfully extracted ${extractedText.length} characters of text`);
    
    return extractedText;
  } catch (error) {
    console.error("Error in extractTextFromFile:", error);
    throw error;
  }
}

/**
 * Validate ZIP file before attempting to extract text
 * This is a lightweight check to ensure the ZIP contains valid images
 */
async function validateZipFile(zipUrl: string, apiKey: string): Promise<boolean> {
  try {
    console.log(`Validating ZIP file: ${zipUrl}`);
    
    // Send a quick check request to OpenAI
    const validationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'You are an image validator. Simply respond with "valid" if you can see any valid image content, otherwise respond with "invalid".'
          },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: 'Is this a valid image?' },
              { 
                type: 'image_url', 
                image_url: {
                  url: zipUrl,
                  detail: 'low'
                }
              }
            ]
          }
        ],
        max_tokens: 50,
        temperature: 0
      }),
    });
    
    if (!validationResponse.ok) {
      const errorData = await validationResponse.json();
      console.error("ZIP validation failed:", JSON.stringify(errorData));
      
      if (errorData.error?.code === 'invalid_image_format') {
        console.error("ZIP contains unsupported image formats");
        return false;
      }
      
      throw new Error(`ZIP validation failed: ${JSON.stringify(errorData.error || errorData)}`);
    }
    
    const validationResult = await validationResponse.json();
    const validationText = validationResult.choices[0].message.content.toLowerCase();
    
    const isValid = validationText.includes('valid') && !validationText.includes('invalid');
    console.log(`ZIP validation result: ${isValid ? 'Valid' : 'Invalid'}`);
    
    return isValid;
  } catch (error) {
    console.error("Error validating ZIP file:", error);
    return false;
  }
}

/**
 * Extract text from a ZIP file containing multiple pages
 */
async function extractTextFromZip(
  zipUrl: string,
  apiKey: string,
  systemPrompt: string
): Promise<string> {
  try {
    console.log(`Extracting text from ZIP file: ${zipUrl}`);
    
    // First validate that the ZIP file contains supported images
    const isValid = await validateZipFile(zipUrl, apiKey);
    if (!isValid) {
      throw new Error("The ZIP file contains unsupported image formats. Please ensure all images are PNG, JPG, JPEG, GIF, or WEBP.");
    }
    
    // If validation passed, extract the text
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: systemPrompt
          },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: 'Extract all text from this multi-page document:' },
              { 
                type: 'image_url', 
                image_url: {
                  url: zipUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error when extracting from ZIP:", JSON.stringify(errorData));
      
      // Provide fallback using individual page extraction if available
      throw new Error(`OCR extraction failed for ZIP file: ${JSON.stringify(errorData.error)}`);
    }
    
    const data = await response.json();
    const extractedText = data.choices[0].message.content;
    
    console.log(`Successfully extracted ${extractedText.length} characters of text from ZIP`);
    
    return extractedText;
  } catch (error) {
    console.error("Error in extractTextFromZip:", error);
    throw error;
  }
}

/**
 * Extract structured questions from question paper text
 */
async function extractQuestionsFromPaper(
  documentUrl: string,
  apiKey: string,
  extractedText: string
): Promise<any> {
  try {
    console.log("Extracting structured questions from question paper");
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: Prompts.questionExtractor
          },
          { 
            role: 'user', 
            content: `Extract all the questions from this question paper:
            
            ${extractedText}`
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Question extraction API error:", errorText);
      throw new Error(`Question extraction failed: ${errorText}`);
    }
    
    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    
    if (!result.questions || !Array.isArray(result.questions)) {
      console.error("Invalid question extraction result:", result);
      throw new Error("Failed to extract questions: Invalid result format");
    }
    
    console.log(`Successfully extracted ${result.questions.length} questions from text`);
    
    return result;
  } catch (error) {
    console.error("Error extracting questions from text:", error);
    // Return an empty questions array as fallback
    return { questions: [] };
  }
}

/**
 * Match student answers to questions using semantic matching
 */
export async function matchAnswersToQuestions(
  apiKey: string,
  questionText: string,
  answerText: string
): Promise<any> {
  try {
    console.log("Starting semantic matching of answers to questions");
    
    const systemPrompt = Prompts.semanticMatching;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Match the student's answers to the corresponding questions.
            
            QUESTION PAPER:
            ${questionText}
            
            STUDENT ANSWER:
            ${answerText}
            
            Return your analysis as a JSON object.`
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Semantic matching API error:", errorText);
      throw new Error(`Semantic matching failed: ${errorText}`);
    }
    
    const data = await response.json();
    const matchingResult = JSON.parse(data.choices[0].message.content);
    
    console.log(`Found ${matchingResult?.matches?.length || 0} question-answer matches`);
    
    return matchingResult;
  } catch (error) {
    console.error("Error in matchAnswersToQuestions:", error);
    throw error;
  }
}

/**
 * Extract questions from question paper text
 */
export async function extractQuestionsFromText(
  apiKey: string,
  questionPaperText: string
): Promise<any[]> {
  try {
    console.log("Extracting structured questions from question paper text");
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: Prompts.questionExtractor
          },
          { 
            role: 'user', 
            content: `Extract all the questions from this question paper:
            
            ${questionPaperText}`
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Question extraction API error:", errorText);
      throw new Error(`Question extraction failed: ${errorText}`);
    }
    
    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    
    if (!result.questions || !Array.isArray(result.questions)) {
      console.error("Invalid question extraction result:", result);
      throw new Error("Failed to extract questions: Invalid result format");
    }
    
    console.log(`Successfully extracted ${result.questions.length} questions from text`);
    
    return result.questions;
  } catch (error) {
    console.error("Error extracting questions from text:", error);
    return [];
  }
}

/**
 * Evaluate a paper using extracted questions, answer key, and student answers
 */
export async function evaluateWithExtractedQuestions(
  apiKey: string,
  extractedQuestions: any[],
  answerKeyText: string | null,
  studentAnswerText: string,
  studentInfo: any
): Promise<any> {
  try {
    console.log(`Evaluating with ${extractedQuestions.length} extracted questions`);
    
    // Prepare evaluation prompt
    const evalPrompt = `You are an AI evaluator specialized in grading student answers.
    
    STUDENT INFORMATION:
    ${JSON.stringify(studentInfo, null, 2)}
    
    QUESTIONS FROM QUESTION PAPER:
    ${JSON.stringify(extractedQuestions, null, 2)}
    
    ${answerKeyText ? `ANSWER KEY:\n${answerKeyText}` : "No answer key provided. Use your best judgment for evaluation."}
    
    STUDENT'S ANSWER:
    ${studentAnswerText}
    
    Compare each student answer against the corresponding question and the answer key (if provided).
    If no answer key is provided, evaluate based on expected knowledge for this subject and grade level.
    
    For each question:
    1. Find the student's answer that corresponds to this question
    2. Evaluate the accuracy and completeness of the answer
    3. Assign a fair score based on the total marks for the question
    4. Provide specific feedback on strengths and weaknesses
    
    Format your evaluation as a JSON object with this structure:
    {
      "student_name": "${studentInfo?.name || 'Unknown'}",
      "roll_no": "${studentInfo?.roll_number || 'Unknown'}",
      "class": "${studentInfo?.class || 'Unknown'}",
      "subject": "${studentInfo?.subject || 'Unknown'}",
      "answers": [
        {
          "question_no": "1",
          "question": "Question text",
          "answer": "Student's answer for this question",
          "expected_answer": "Expected answer based on answer key or your knowledge",
          "score": [5, 10],  // [awarded score, maximum score]
          "remarks": "Detailed feedback on the answer",
          "confidence": 0.9,  // confidence in evaluation
          "match_method": "direct_numbering" or "semantic_matching"
        },
        // Repeat for all questions
      ],
      "summary": {
        "totalScore": [25, 50],  // [total awarded, total possible]
        "percentage": 50,
        "strengths": ["Strength 1", "Strength 2"],
        "areas_for_improvement": ["Area 1", "Area 2"]
      }
    }`;
    
    // Call OpenAI API for evaluation
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: Prompts.questionBasedEvaluation },
          { role: 'user', content: evalPrompt }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Evaluation API error:", errorText);
      throw new Error(`Evaluation failed: ${errorText}`);
    }
    
    const data = await response.json();
    const evaluation = JSON.parse(data.choices[0].message.content);
    
    console.log("Evaluation completed successfully");
    
    return evaluation;
  } catch (error) {
    console.error("Error in evaluateWithExtractedQuestions:", error);
    throw error;
  }
}

// Export helper functions for document processor
export { extractTextFromFile, extractTextFromZip, extractQuestionsFromPaper };
