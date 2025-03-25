
import { createOpenAIService } from "../services/openai-service.ts";
import { urlToBase64, cleanUrlForApi } from "../utils/image-processing.ts";

/**
 * Extract text from a file using OpenAI Vision API
 * With improved memory handling for large files
 */
export async function extractTextFromFile(fileUrl: string, apiKey: string, systemPrompt: string = '', userPrompt?: string): Promise<string> {
  try {
    if (!fileUrl) {
      throw new Error("No file URL provided");
    }
    
    console.log(`Extracting text from file: ${fileUrl}`);
    
    // Check if this is a ZIP file - if so, pass it directly to OpenAI
    if (/\.zip/i.test(fileUrl)) {
      console.log("ZIP file detected, sending directly to OpenAI for processing");
      // Clean the URL by removing any query parameters
      const cleanedUrl = cleanUrlForApi(fileUrl);
      console.log(`Using cleaned ZIP URL for OCR: ${cleanedUrl}`);
      
      return await extractTextFromImageFile(
        cleanedUrl,
        apiKey,
        systemPrompt || "You are an OCR tool optimized for extracting text from documents. Extract all visible text content accurately."
      );
    }
    
    // Process the image URL - this will return either a base64 string or a direct URL
    let imageData;
    try {
      // With the improved function, this will either return base64 or a direct URL
      imageData = await urlToBase64(fileUrl);
      console.log(`Successfully processed image, result length: ${imageData?.length || 0} chars`);
      
      // If it's a very short result, it's likely a direct URL, not base64 data
      if (imageData.length < 200 && imageData.startsWith('http')) {
        console.log("Using direct image URL instead of base64 for better memory efficiency");
      }
    } catch (imageError) {
      console.error("Error processing image URL:", imageError);
      
      // If we can't convert to base64, try using the URL directly
      console.log("Falling back to direct URL for OpenAI");
      imageData = cleanUrlForApi(fileUrl);
    }
    
    const openAIService = createOpenAIService(apiKey);
    
    const promptText = userPrompt || "Extract all the text from this document, focusing on identifying question numbers and their corresponding content:";
    
    try {
      const response = await openAIService.createChatCompletion({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt || "Extract text from the image accurately, preserving formatting.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: promptText },
              {
                type: "image_url",
                image_url: {
                  url: imageData,
                  detail: "high"
                },
              },
            ],
          },
        ],
        max_tokens: 4000,
        temperature: 0.2,
      });

      if (!response?.data?.choices?.[0]?.message?.content) {
        throw new Error("OpenAI API returned an empty response");
      }

      const extractedText = response.data.choices[0].message.content;
      console.log(`Extracted text: ${extractedText.length} characters`);
      return extractedText;
    } catch (apiError: any) {
      // Handle specific API errors
      if (apiError.response) {
        console.error("OpenAI API error:", apiError.response.status, apiError.response.data);
        
        if (apiError.response.status === 400) {
          const errorMessage = apiError.response.data?.error?.message || "";
          if (errorMessage.includes('invalid_image')) {
            console.error("Invalid image format error:", errorMessage);
            throw new Error(`Invalid image format: ${errorMessage}. Please check the image format and accessibility.`);
          }
        }
      }
      
      throw new Error(`OCR extraction failed: ${apiError.message || "Unknown API error"}`);
    }
  } catch (error: any) {
    console.error("Error extracting text from file:", error);
    throw new Error(`OCR extraction failed: ${error.message || "Unknown error"}`);
  }
}

/**
 * Extracts text from a single image file
 * Optimized for memory efficiency and reliability
 */
export async function extractTextFromImageFile(
  fileUrl: string, 
  apiKey: string, 
  systemPrompt: string,
  userPrompt?: string
): Promise<string> {
  try {
    if (!fileUrl) {
      throw new Error("No file URL provided");
    }
    
    console.log("Processing file for OCR extraction");
    
    // Direct API call to OpenAI with increased timeout
    // Increase timeout to 180 seconds (3 minutes) for large ZIP files
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minute timeout
    
    // For most efficiency, we'll use the URL directly rather than converting to base64
    // This prevents memory issues with large files
    let imageUrl = cleanUrlForApi(fileUrl);
    console.log(`Using direct URL for OCR: ${imageUrl}`);
    
    const promptText = userPrompt || "Extract all the text from this document, focusing on identifying question numbers and their corresponding content:";
    
    try {
      // Approach 1: Try direct fetch with OpenAI API
      console.log("Attempting OCR with direct OpenAI API call");
      
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
            { role: 'system', content: systemPrompt || "Extract text accurately, preserving formatting." },
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
        
        // Specific error handling for ZIP files
        if ((errorText.includes("Timeout while downloading") || 
             errorText.includes("invalid_image_format")) && 
            fileUrl.includes(".zip")) {
          throw new Error("Timeout or format error processing ZIP file. The file may be too large or in an unsupported format.");
        }
        
        throw new Error("OCR extraction failed: " + errorText);
      }
      
      const ocrResult = await ocrResponse.json();
      const extractedOcrText = ocrResult?.choices?.[0]?.message?.content;
      
      if (!extractedOcrText) {
        throw new Error("OpenAI API returned an empty response");
      }
      
      console.log("OCR extraction successful, extracted text length:", extractedOcrText.length);
      console.log("Sample extracted text:", extractedOcrText.substring(0, 100) + "...");
      
      return extractedOcrText;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if ((error.message?.includes("Timeout") || 
           error.message?.includes("invalid_image_format")) && 
          fileUrl.includes(".zip")) {
        console.error("Error processing ZIP file:", error);
        
        // Return a helpful error message for users
        return `The document is too large or complex for direct processing. Please consider these options:
1. Split the PDF into smaller files (1-2 pages each)
2. Upload individual images of pages instead of a large PDF
3. Try again with a lower resolution scan

Technical Error: ${error.message}`;
      }
      
      console.error("Error during OCR processing:", error);
      throw error;
    }
  } catch (error: any) {
    console.error("Error during OCR processing:", error);
    throw error;
  }
}
