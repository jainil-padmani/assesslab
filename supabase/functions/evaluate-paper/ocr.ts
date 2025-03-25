import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageFile {
  name: string;
  dataUrl: string;
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
      const timeout = attempt * 30000; // 30s, 60s, 90s
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      console.log(`Download attempt ${attempt} for ${url} with timeout ${timeout}ms`);
      
      // Try to download with current timeout
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
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
 * Extracts text from a ZIP file containing images using GPT-4o
 */
export async function extractTextFromZip(
  zipUrl: string, 
  apiKey: string, 
  systemPrompt: string
): Promise<string> {
  try {
    console.log("Processing ZIP URL for enhanced OCR:", zipUrl);
    
    // Fetch the ZIP file with retries and longer timeout
    let zipResponse;
    try {
      zipResponse = await downloadWithRetry(zipUrl);
    } catch (downloadError) {
      console.error("Failed to download ZIP file after retries:", downloadError);
      throw new Error("Failed to download ZIP file: " + downloadError.message);
    }
    
    const zipData = await zipResponse.arrayBuffer();
    console.log("Successfully downloaded ZIP file, size:", zipData.byteLength);
    
    if (zipData.byteLength === 0) {
      throw new Error("Downloaded ZIP file is empty");
    }
    
    // Extract PNG files from ZIP
    let zip;
    try {
      zip = await JSZip.loadAsync(zipData);
    } catch (zipError) {
      console.error("Error loading ZIP file:", zipError);
      throw new Error("Failed to process ZIP file: " + zipError.message);
    }
    
    const imagePromises = [];
    const imageFiles: ImageFile[] = [];
    
    // Process each file in the ZIP
    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir && (relativePath.endsWith('.png') || relativePath.endsWith('.jpg'))) {
        const promise = zipEntry.async('base64').then(base64Data => {
          const imgFormat = relativePath.endsWith('.png') ? 'png' : 'jpeg';
          imageFiles.push({
            name: relativePath,
            dataUrl: `data:image/${imgFormat};base64,${base64Data}`
          });
        });
        imagePromises.push(promise);
      }
    });
    
    await Promise.all(imagePromises);
    
    // Sort images by filename (ensures page order)
    imageFiles.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`Successfully extracted ${imageFiles.length} images from ZIP`);
    
    if (imageFiles.length === 0) {
      throw new Error("No image files found in ZIP");
    }
    
    // Use GPT-4o's vision capabilities for OCR on all pages
    console.log("Performing OCR with GPT-4o on extracted images...");
    
    const messages = [
      { role: 'system', content: systemPrompt }
    ];
    
    // Create user message with text and images
    const userContent = [
      { 
        type: 'text', 
        text: `Extract all the text from these ${imageFiles.length} pages, focusing on identifying question numbers and their corresponding content:` 
      }
    ];
    
    // Add each image to the request (up to 20 images)
    const maxImages = Math.min(imageFiles.length, 20);
    for (let i = 0; i < maxImages; i++) {
      userContent.push({ 
        type: 'image_url', 
        image_url: { 
          url: imageFiles[i].dataUrl,
          detail: "high" 
        } 
      });
    }
    
    messages.push({ role: 'user', content: userContent });
    
    // Make the OpenAI API call with retries
    let ocrResult;
    try {
      // Increase timeout for OpenAI API call (120 seconds)
      const ocrController = new AbortController();
      const ocrTimeoutId = setTimeout(() => ocrController.abort(), 120000);
      
      const ocrResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: ocrController.signal,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: messages,
          temperature: 0.2,
          max_tokens: 4000,
        }),
      });
      
      clearTimeout(ocrTimeoutId);

      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        console.error("OpenAI OCR error:", errorText);
        throw new Error("OCR extraction failed: " + errorText);
      }
      
      ocrResult = await ocrResponse.json();
    } catch (apiError) {
      console.error("Error calling OpenAI API:", apiError);
      throw new Error("OpenAI API error: " + apiError.message);
    }
    
    const extractedOcrText = ocrResult.choices[0]?.message?.content;
    
    if (!extractedOcrText) {
      throw new Error("OCR process returned an empty result");
    }
    
    console.log("OCR extraction successful, extracted text length:", extractedOcrText?.length || 0);
    console.log("Sample extracted text:", extractedOcrText?.substring(0, 100) + "...");
    
    return extractedOcrText;
  } catch (error) {
    console.error("Error processing ZIP file:", error);
    throw error;
  }
}

/**
 * Extracts text from a single image or PDF file using GPT-4o
 */
export async function extractTextFromFile(
  fileUrl: string, 
  apiKey: string, 
  systemPrompt: string,
  userPrompt?: string
): Promise<string> {
  try {
    console.log("Processing file for OCR extraction:", fileUrl);
    
    const promptText = userPrompt || "Extract all the text from this document, focusing on identifying question numbers and their corresponding content:";
    
    // Make the OpenAI API call with retries
    let ocrResult;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // Increase timeout for each retry
        const timeout = (retryCount + 1) * 60000; // 60s, 120s, 180s
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        console.log(`OCR API attempt ${retryCount + 1} with timeout ${timeout}ms`);
        
        const ocrResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
                  { type: 'text', text: promptText },
                  { 
                    type: 'image_url', 
                    image_url: { 
                      url: fileUrl,
                      detail: "high" 
                    } 
                  }
                ] 
              }
            ],
            temperature: 0.2,
            max_tokens: 4000,
          }),
        });
        
        clearTimeout(timeoutId);

        if (!ocrResponse.ok) {
          const errorText = await ocrResponse.text();
          console.error(`OpenAI OCR error (attempt ${retryCount + 1}):`, errorText);
          
          // Check if we should retry based on error type
          if (errorText.includes("invalid_image_url") || errorText.includes("Timeout while downloading")) {
            retryCount++;
            if (retryCount < maxRetries) {
              // Add exponential backoff
              const delay = Math.min(2000 * Math.pow(2, retryCount), 30000);
              console.log(`Retrying OCR extraction in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            } else {
              throw new Error("OCR extraction failed after multiple attempts: " + errorText);
            }
          } else {
            // For other errors, fail immediately
            throw new Error("OCR extraction failed: " + errorText);
          }
        }
        
        ocrResult = await ocrResponse.json();
        break; // Success, exit the retry loop
      } catch (apiError) {
        if (apiError.name === 'AbortError') {
          console.error(`OCR API timeout on attempt ${retryCount + 1}`);
          retryCount++;
          if (retryCount < maxRetries) {
            // Add exponential backoff
            const delay = Math.min(2000 * Math.pow(2, retryCount), 30000);
            console.log(`Retrying OCR extraction in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            throw new Error("OCR extraction timed out after multiple attempts");
          }
        } else {
          console.error("Error calling OpenAI API:", apiError);
          throw new Error("OpenAI API error: " + apiError.message);
        }
      }
    }
    
    const extractedOcrText = ocrResult?.choices[0]?.message?.content;
    
    if (!extractedOcrText) {
      throw new Error("OCR process returned an empty result");
    }
    
    console.log("OCR extraction successful, extracted text length:", extractedOcrText?.length || 0);
    console.log("Sample extracted text:", extractedOcrText?.substring(0, 100) + "...");
    
    return extractedOcrText;
  } catch (error) {
    console.error("Error during OCR processing:", error);
    throw error;
  }
}

/**
 * Extracts questions from a question paper using OCR
 */
export async function extractQuestionsFromPaper(
  paperUrl: string,
  apiKey: string
): Promise<{ questions: Array<{ number: string, text: string, marks?: number }> }> {
  try {
    console.log("Extracting questions from paper:", paperUrl);
    
    const systemPrompt = `You are an expert at analyzing question papers. Carefully extract all questions from the given document.
For each question:
1. Identify the question number
2. Extract the complete question text
3. Identify the marks allocated if mentioned

Return the results in a structured format as a valid JSON object with a 'questions' array containing objects with 'number', 'text', and optionally 'marks' properties.
Example:
{
  "questions": [
    {"number": "1", "text": "Explain Newton's laws of motion", "marks": 5},
    {"number": "2", "text": "Define momentum and impulse", "marks": 3}
  ]
}
Ensure your response is ONLY the JSON object with no additional explanations or text.`;
    
    const userPrompt = "Extract all questions from this question paper. Identify each question number, the complete question text, and marks if available. Return ONLY a JSON object with the structure shown in the system prompt.";
    
    // Determine if it's a ZIP file or single file
    const isZip = paperUrl.includes('.zip');
    
    // Use the appropriate method for extraction
    let extractedText;
    if (isZip) {
      extractedText = await extractTextFromZip(paperUrl, apiKey, systemPrompt);
    } else {
      extractedText = await extractTextFromFile(paperUrl, apiKey, systemPrompt, userPrompt);
    }
    
    // Try to parse the extracted text as JSON
    try {
      // Check if the text starts with a code block marker and ends with one
      let jsonText = extractedText;
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.substring(7);
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.substring(3);
      }
      
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.substring(0, jsonText.length - 3);
      }
      
      jsonText = jsonText.trim();
      
      const parsedQuestions = JSON.parse(jsonText);
      console.log(`Successfully extracted ${parsedQuestions.questions?.length || 0} questions from paper`);
      
      return parsedQuestions;
    } catch (parseError) {
      console.error("Error parsing extracted questions:", parseError);
      
      // If parsing fails, try to extract questions using a second API call
      console.log("Attempting to structure the extracted text with a second API call");
      
      const structuringResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: `You are an expert at structuring question paper data. Convert the given OCR text into a valid JSON format with the structure: 
              {
                "questions": [
                  {"number": "1", "text": "Question text here", "marks": 5},
                  {"number": "2", "text": "Another question", "marks": 3}
                ]
              }
              Return ONLY the JSON object with no additional text.` 
            },
            { role: 'user', content: extractedText }
          ],
          temperature: 0.2,
          max_tokens: 4000,
          response_format: { type: "json_object" }
        }),
      });
      
      if (!structuringResponse.ok) {
        throw new Error("Failed to structure extracted questions");
      }
      
      const structuredResult = await structuringResponse.json();
      const structuredText = structuredResult.choices[0]?.message?.content;
      
      if (!structuredText) {
        throw new Error("Failed to structure extracted questions - empty response");
      }
      
      try {
        const parsedQuestions = JSON.parse(structuredText);
        console.log(`Successfully structured ${parsedQuestions.questions?.length || 0} questions from paper`);
        return parsedQuestions;
      } catch (secondParseError) {
        console.error("Error parsing structured questions:", secondParseError);
        throw new Error("Failed to parse questions after multiple attempts");
      }
    }
  } catch (error) {
    console.error("Error extracting questions from paper:", error);
    throw error;
  }
}

/**
 * Evaluates student answers against extracted questions and answer key
 */
export async function evaluateWithExtractedQuestions(
  apiKey: string,
  questions: Array<{ number: string, text: string, marks?: number }>,
  answerKeyText: string | null,
  studentAnswerText: string,
  studentInfo: any
): Promise<any> {
  try {
    console.log("Evaluating with extracted questions for student:", studentInfo?.name);
    
    // Prepare the system prompt based on whether we have an answer key
    const systemPrompt = answerKeyText 
      ? `You are an expert evaluator for academic assessments. Your task is to evaluate a student's answers against the provided question paper and answer key.
For each question, compare the student's answer with the expected answer, assign appropriate marks, and provide brief feedback.
Be fair and objective in your assessment.`
      : `You are an expert evaluator for academic assessments. Your task is to evaluate a student's answers based on the provided questions.
Without an official answer key, use your expertise to judge the correctness, completeness, and quality of the student's answers.
For each question, evaluate the student's answer, assign appropriate marks, and provide brief feedback.
Be fair and objective in your assessment.`;
    
    // Prepare the user prompt with all the data
    const userPrompt = `
Question Paper:
${JSON.stringify(questions)}

${answerKeyText ? `Answer Key:
${answerKeyText}` : "No answer key provided. Use your expertise to evaluate the answers."}

Student's Answers:
${studentAnswerText}

Student Info:
${JSON.stringify(studentInfo)}

Evaluate the student's answers and provide a response in this exact JSON format:
{
  "student_name": "${studentInfo?.name || 'Unknown'}",
  "roll_no": "${studentInfo?.roll_number || 'Unknown'}",
  "class": "${studentInfo?.class || 'Unknown'}",
  "subject": "${studentInfo?.subject || 'Unknown'}",
  "answers": [
    {
      "question_no": "question number",
      "question": "question text",
      "answer": "student's answer",
      "score": [assigned_score, total_score],
      "remarks": "brief feedback on the answer",
      "confidence": 0.85 // a value between 0 and 1
    },
    // other questions...
  ],
  "summary": {
    "totalScore": [total_assigned_score, total_possible_score],
    "percentage": percentage_score
  }
}

Return ONLY the JSON object without any additional explanations or text.`;

    // Make the OpenAI API call for evaluation
    const evaluationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      }),
    });
    
    if (!evaluationResponse.ok) {
      const errorText = await evaluationResponse.text();
      console.error("OpenAI evaluation error:", errorText);
      throw new Error(`Evaluation failed: ${errorText}`);
    }
    
    const evaluationResult = await evaluationResponse.json();
    const evaluation = evaluationResult.choices[0]?.message?.content;
    
    if (!evaluation) {
      throw new Error("Evaluation process returned an empty result");
    }
    
    try {
      // Parse the evaluation result
      const parsedEvaluation = JSON.parse(evaluation);
      console.log("Evaluation completed successfully for student:", studentInfo?.name);
      return parsedEvaluation;
    } catch (parseError) {
      console.error("Error parsing evaluation result:", parseError);
      throw new Error("Failed to parse evaluation result");
    }
  } catch (error) {
    console.error("Error evaluating with extracted questions:", error);
    throw error;
  }
}
