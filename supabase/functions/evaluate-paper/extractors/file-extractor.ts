
import { createOpenAIService } from "../services/openai-service.ts";
import { urlToBase64, cleanUrlForApi } from "../utils/image-processing.ts";

/**
 * Extract text from a file using OpenAI Vision API
 */
export async function extractTextFromFile(fileUrl: string, apiKey: string, systemPrompt: string = '', userPrompt?: string): Promise<string> {
  try {
    if (!fileUrl) {
      throw new Error("No file URL provided");
    }
    
    console.log(`Extracting text from file: ${fileUrl}`);
    
    // Check if this is a ZIP file - if so, we can pass it directly to OpenAI
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
    
    // Process the image URL to get a base64 representation
    let imageData;
    try {
      imageData = await urlToBase64(fileUrl);
      console.log(`Successfully processed image to data URL. Length: ${imageData?.length || 0} chars`);
      
      // Basic validation of the data URL format
      if (!imageData?.startsWith('data:image/')) {
        throw new Error("Invalid image format: The data URL must have an image MIME type");
      }
    } catch (imageError) {
      console.error("Error processing image URL:", imageError);
      throw new Error(`Failed to process image URL: ${imageError.message}`);
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
 * Now directly sends ZIP URLs to OpenAI for processing
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
    // Increase timeout to 120 seconds (2 minutes) for large ZIP files
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
    
    let imageUrl = fileUrl;
    
    // If it's not a ZIP file, convert to base64 first (needed for OpenAI API)
    if (!fileUrl.includes('.zip')) {
      try {
        imageUrl = await urlToBase64(fileUrl);
        console.log("Successfully converted image to data URL for direct API call");
        
        // Validate the image format
        if (!imageUrl.startsWith('data:image/') && !fileUrl.includes('.zip')) {
          throw new Error("Invalid image format: The data URL must have an image MIME type");
        }
      } catch (e) {
        console.error("Could not convert to base64, error:", e);
        throw new Error(`Failed to process image: ${e.message}`);
      }
    } else {
      console.log("Using ZIP URL directly for OCR processing");
      // Make sure we're using a clean URL without query parameters for ZIP files
      imageUrl = cleanUrlForApi(fileUrl);
      console.log(`Cleaned ZIP URL for OCR: ${imageUrl}`);
    }
    
    const promptText = userPrompt || "Extract all the text from this document, focusing on identifying question numbers and their corresponding content:";
    
    try {
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
      console.error("Error during OCR processing:", error);
      throw error;
    }
  } catch (error: any) {
    console.error("Error during OCR processing:", error);
    throw error;
  }
}
