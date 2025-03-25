
/**
 * Utility functions for OCR processing using OpenAI API
 */
import { ensureSupportedFormat } from "./image-validation.ts";

/**
 * Creates a system prompt for OCR based on the file type
 */
export function getSystemPrompt(fileType?: string): string {
  if (fileType === 'questionPaper') {
    return `You are an OCR expert specialized in extracting text from question papers.
    
    For each question in the document:
    1. Identify the question number clearly.
    2. Extract the complete question text along with any subparts.
    3. Format each question on a new line starting with "Q<number>:" followed by the question.
    4. Preserve the structure of mathematical equations, diagrams descriptions, and any special formatting.
    5. Include all instructions, marks allocations, and other relevant information.
    
    Your response should be structured, accurate, and preserve the original content's organization.`;
  } 
  else if (fileType === 'answerKey') {
    return `You are an OCR expert specialized in extracting text from answer keys.
    
    For each answer in the document:
    1. Identify the question number clearly.
    2. Extract the complete answer text along with any marking guidelines.
    3. Format each answer on a new line starting with "Q<number>:" followed by the answer.
    4. Preserve the structure of mathematical equations, diagrams, and any special formatting.
    5. Include all marking schemes, points allocation, and other evaluation criteria.
    
    Your response should be structured, accurate, and preserve the original content's organization.`;
  }
  
  // Default for answer sheets and other documents
  return `You are an OCR expert specialized in extracting text from handwritten answer sheets and documents.
  
  For each question in the document:
  1. Identify the question number clearly.
  2. Extract the complete answer text.
  3. Format each answer on a new line starting with "Q<number>:" followed by the answer.
  4. If the handwriting is difficult to read, make your best effort and indicate uncertainty with [?].
  5. Maintain the structure of mathematical equations, diagrams descriptions, and any special formatting.
  6. If you identify multiple pages, process each and maintain continuity between questions.
  
  Your response should be structured, accurate, and preserve the original content's organization.`;
}

/**
 * Performs OCR on a batch of images using OpenAI's API
 */
export async function performBatchOcr(
  imageFiles: {name: string, dataUrl: string}[],
  apiKey: string,
  systemPrompt: string,
  maxImagesPerBatch = 20
): Promise<string> {
  try {
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
    
    // Add each image to the request (up to max images)
    const maxImages = Math.min(imageFiles.length, maxImagesPerBatch);
    for (let i = 0; i < maxImages; i++) {
      try {
        // Ensure the image format is supported and properly formatted
        const processedImageUrl = ensureSupportedFormat(imageFiles[i].dataUrl, imageFiles[i].name);
        
        userContent.push({ 
          type: 'image_url', 
          image_url: { 
            url: processedImageUrl,
            detail: "high" 
          } 
        });
      } catch (imageError) {
        console.error(`Error processing image ${imageFiles[i].name}:`, imageError);
        // Continue with other images
      }
    }
    
    messages.push({ role: 'user', content: userContent });
    
    // Increase timeout for OpenAI API call
    const ocrController = new AbortController();
    const ocrTimeoutId = setTimeout(() => ocrController.abort(), 120000);
    
    try {
      console.log("Sending request to OpenAI with images...");
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
        const errorData = await ocrResponse.json();
        console.error("OpenAI OCR error:", JSON.stringify(errorData));
        throw new Error(`OCR extraction failed: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const ocrResult = await ocrResponse.json();
      const extractedOcrText = ocrResult.choices[0]?.message?.content;
      
      console.log("OCR extraction successful, extracted text length:", extractedOcrText?.length || 0);
      console.log("Sample extracted text:", extractedOcrText?.substring(0, 100) + "...");
      
      return extractedOcrText;
    } catch (apiError) {
      clearTimeout(ocrTimeoutId);
      console.error("Error during OpenAI API call:", apiError);
      throw apiError;
    }
  } catch (error) {
    console.error("Error in performBatchOcr:", error);
    throw error;
  }
}

/**
 * Performs OCR on a single image using OpenAI's API
 */
export async function performSingleImageOcr(
  imageUrl: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt?: string
): Promise<string> {
  try {
    console.log("Performing OCR on single image:", imageUrl);
    
    // Use a controller with timeout for the OCR request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    const promptText = userPrompt || "Extract all the text from this document, focusing on identifying question numbers and their corresponding content:";
    
    console.log("Sending OCR request to OpenAI API...");
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
                  url: imageUrl,
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
      console.error("OpenAI OCR error:", errorText);
      throw new Error("OCR extraction failed: " + errorText);
    }
    
    const ocrResult = await ocrResponse.json();
    const extractedOcrText = ocrResult.choices[0]?.message?.content;
    
    console.log("OCR extraction successful, extracted text length:", extractedOcrText?.length || 0);
    console.log("Sample extracted text:", extractedOcrText?.substring(0, 100) + "...");
    
    return extractedOcrText;
  } catch (error) {
    console.error("Error during OCR processing:", error);
    throw error;
  }
}
