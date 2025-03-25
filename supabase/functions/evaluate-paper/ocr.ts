import { Prompts } from './prompts.ts';

const OCR_API_TIMEOUT = 60000; // 60 seconds timeout
const MAX_RETRIES = 3;

// Extract text from a single image file using OpenAI's Vision API
export async function extractTextFromFile(
  fileUrl: string,
  apiKey: string,
  systemPrompt: string,
  retryAttempt = 0
): Promise<string> {
  try {
    console.log(`OCR API attempt ${retryAttempt + 1} with timeout ${OCR_API_TIMEOUT}ms`);
    
    // Create controller for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OCR_API_TIMEOUT);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
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
            content: [
              { type: 'text', text: 'Extract all the text from this image.' },
              { type: 'image_url', image_url: { url: fileUrl } }
            ] 
          }
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`OpenAI API error (${response.status}):`, errorData);
      
      // If we got a timeout or connection error and we haven't reached max retries,
      // wait and try again with exponential backoff
      if (retryAttempt < MAX_RETRIES - 1 && 
          (response.status === 408 || response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504)) {
        const backoffTime = Math.pow(2, retryAttempt) * 2000;
        console.log(`Retrying OCR after ${backoffTime}ms delay, attempt ${retryAttempt + 2}/${MAX_RETRIES}`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return extractTextFromFile(fileUrl, apiKey, systemPrompt, retryAttempt + 1);
      }
      
      throw new Error(`OCR extraction failed: ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    const text = data.choices[0]?.message?.content || '';
    
    return text;
  } catch (error) {
    // Check if we've reached max retries
    if (error.name === 'AbortError' && retryAttempt < MAX_RETRIES - 1) {
      console.log(`OCR timeout, retrying (${retryAttempt + 2}/${MAX_RETRIES})...`);
      const backoffTime = Math.pow(2, retryAttempt) * 2000;
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      return extractTextFromFile(fileUrl, apiKey, systemPrompt, retryAttempt + 1);
    }
    console.error('Error extracting text from file:', error);
    throw error;
  }
}

// Extract text from a zip file containing multiple images
export async function extractTextFromZip(
  zipFileUrl: string,
  apiKey: string,
  systemPrompt: string
): Promise<string> {
  try {
    // For ZIP files, use a specialized prompt to handle multi-page extraction
    const enhancedPrompt = `${systemPrompt}\n\nThis is a multi-page document. Extract all the text, maintaining the order of pages and structure of the content.`;
    
    // We can use the same API call format but tell the system it's a multi-page document
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OCR_API_TIMEOUT * 2); // Double timeout for ZIP files
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: enhancedPrompt },
          { 
            role: 'user',
            content: [
              { type: 'text', text: 'Extract all the text from this multi-page document (ZIP file).' },
              { type: 'image_url', image_url: { url: zipFileUrl } }
            ] 
          }
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`OpenAI API error for ZIP file (${response.status}):`, errorData);
      throw new Error(`OCR extraction failed for ZIP file: ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    const text = data.choices[0]?.message?.content || '';
    
    return text;
  } catch (error) {
    console.error('Error extracting text from ZIP file:', error);
    throw error;
  }
}

// Function to extract structured questions from the question paper
export async function extractQuestionsFromPaper(
  paperUrl: string, 
  apiKey: string,
  extractedText?: string
): Promise<{ questions: any[] }> {
  try {
    // Use either API-based extraction using the document URL or use pre-extracted text
    let requestBody;
    
    if (extractedText) {
      // If we already have the extracted text, use it directly
      requestBody = JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: Prompts.questionExtractor 
          },
          { 
            role: 'user', 
            content: `Extract all the questions from this question paper. Return ONLY a JSON object with a 'questions' property containing an array of question objects.
            
            Question Paper Text:
            ${extractedText}` 
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });
    } else {
      // Otherwise use the Vision API to extract questions directly from the document
      requestBody = JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: Prompts.questionExtractor 
          },
          { 
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: 'Extract all the questions from this question paper. Return ONLY a JSON object with a \'questions\' property containing an array of question objects.' 
              },
              { 
                type: 'image_url', 
                image_url: { url: paperUrl } 
              }
            ] 
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: requestBody
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error extracting questions:', errorData);
      throw new Error(`Question extraction failed: ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in question extraction response');
    }
    
    try {
      const parsedContent = JSON.parse(content);
      
      if (!parsedContent.questions || !Array.isArray(parsedContent.questions)) {
        throw new Error('Invalid questions format in response');
      }
      
      return parsedContent;
    } catch (parseError) {
      console.error('Error parsing question extraction result:', parseError, content);
      throw new Error('Failed to parse extracted questions');
    }
  } catch (error) {
    console.error('Error in extractQuestionsFromPaper:', error);
    throw error;
  }
}

// Evaluate student answers using the extracted questions and semantic matching
export async function evaluateWithExtractedQuestions(
  apiKey: string,
  questions: any[],
  answerKeyText: string | null,
  studentAnswerText: string,
  studentInfo: any
): Promise<any> {
  try {
    console.log(`Evaluating with ${questions.length} extracted questions`);
    
    const systemPrompt = Prompts.questionBasedEvaluation;
    
    const promptContent = `
You are evaluating a student's answer sheet for an exam. 
Here are the extracted questions from the question paper:

${JSON.stringify(questions, null, 2)}

${answerKeyText ? `Here is the answer key text:
${answerKeyText}` : 'No answer key is provided. Use your expertise to evaluate the answers.'}

Here is the student's answer sheet:
${studentAnswerText}

Student Information:
${JSON.stringify(studentInfo, null, 2)}

Evaluate each question and assign marks based on the correctness of the answer.
Your task:
1. First, map each answer in the student's sheet to the corresponding question using semantic matching
2. If student answers are numbered, use those numbers to match with questions
3. If numbering is unclear or missing, match based on content similarity
4. Evaluate each answer against the expected answer from the answer key or your expertise
5. Provide partial credit where appropriate based on the correctness of the answer

Provide a detailed evaluation in JSON format with the following structure:

{
  "student_name": "${studentInfo?.name || 'Unknown'}",
  "roll_no": "${studentInfo?.roll_number || 'Unknown'}",
  "class": "${studentInfo?.class || 'Unknown'}",
  "subject": "${studentInfo?.subject || 'Unknown'}",
  "answers": [
    {
      "question_no": "1",
      "question": "The question text",
      "answer": "Student's answer",
      "expected_answer": "The expected answer based on answer key or expertise",
      "score": [5, 10],
      "remarks": "Comments on the answer including justification for partial credit if given",
      "confidence": 0.9,
      "match_method": "direct_numbering or semantic_matching"
    },
    ...
  ],
  "summary": {
    "totalScore": [25, 50],
    "percentage": 50
  }
}

Return ONLY the JSON object, without any additional text.
`;

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
          { role: 'user', content: promptContent }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Evaluation API error: ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    let evaluationResult;
    
    try {
      evaluationResult = JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error('Error parsing evaluation result:', error);
      throw new Error('Failed to parse evaluation result');
    }
    
    return evaluationResult;
  } catch (error) {
    console.error('Error in evaluateWithExtractedQuestions:', error);
    throw error;
  }
}

// New function to match student answers with question paper using NLP/semantic matching
export async function matchAnswersToQuestions(
  apiKey: string,
  questionPaperText: string,
  studentAnswerText: string
): Promise<{ matches: any[] }> {
  try {
    console.log('Matching student answers to question paper using semantic matching');
    
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
            content: 'You are an AI assistant specialized in matching student answers to exam questions. Your task is to identify and match each answer in a student\'s answer sheet to the corresponding question in a question paper, even if numbering is unclear or answers are in a different order.' 
          },
          { 
            role: 'user', 
            content: `I need to match student answers to questions from a question paper.

Question Paper:
${questionPaperText}

Student's Answer Sheet:
${studentAnswerText}

Please identify which parts of the student's answer sheet correspond to which questions in the question paper. Return the results as a JSON array with the following format:
[
  {
    "question_number": "1",
    "question_text": "The full question text from the paper",
    "student_answer": "The student's answer for this question",
    "match_confidence": 0.95,
    "match_method": "direct_numbering or semantic_matching"
  },
  ...
]` 
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Answer matching API error: ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    let matchingResult;
    
    try {
      matchingResult = JSON.parse(data.choices[0].message.content);
      return matchingResult;
    } catch (error) {
      console.error('Error parsing answer matching result:', error);
      throw new Error('Failed to parse answer matching result');
    }
  } catch (error) {
    console.error('Error in matchAnswersToQuestions:', error);
    throw error;
  }
}

