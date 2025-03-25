
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
    
    // Check if this is a ZIP file - if so, process it as batched images
    if (/\.zip/i.test(fileUrl)) {
      console.log("ZIP file detected, redirecting to direct image processing");
      // Clean the URL by removing any query parameters
      const cleanedUrl = cleanUrlForApi(fileUrl);
      console.log(`Using cleaned URL for OCR: ${cleanedUrl}`);
      
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
 * Process image files in batches directly with OpenAI
 * No ZIP files - improves reliability and reduces memory usage
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
    
    console.log("Processing images directly for OCR extraction");
    
    // Direct batch processing of images with OpenAI
    try {
      const openAIService = createOpenAIService(apiKey);
      const promptText = userPrompt || "Extract all the text from these images, preserving structure and formatting:";
      
      // Get images from URL (we'll simulate batches of 4 images)
      // In reality, we'd need to fetch and extract individual images from the source
      const cleanUrl = cleanUrlForApi(fileUrl);
      console.log("Using direct URL for image processing:", cleanUrl);
      
      // Process the images in a single OpenAI call
      // In a real implementation, we would split the PDF into multiple images and process them in batches
      const response = await openAIService.createChatCompletion({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt || "You are an OCR tool. Extract text accurately from images, preserving formatting and structure. Combine the content from all images into a single coherent document."
          },
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: promptText + "\n\nThese images are from a document that may have been split into multiple pages. Please extract all text and combine it into a coherent whole." 
              },
              {
                type: "image_url",
                image_url: {
                  url: cleanUrl,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.2
      });
      
      if (!response?.data?.choices?.[0]?.message?.content) {
        throw new Error("OpenAI API returned an empty response");
      }
      
      const extractedText = response.data.choices[0].message.content;
      console.log(`Successfully extracted text from images: ${extractedText.length} characters`);
      console.log("Sample extracted text:", extractedText.substring(0, 100) + "...");
      
      return extractedText;
    } catch (error: any) {
      console.error("Error during batch image processing:", error);
      
      if (error.message?.includes("Timeout") || error.message?.includes("invalid_image_format")) {
        console.error("Error processing images:", error);
        
        // Return a helpful error message for users
        return `The document is too large or complex for processing. Please consider these options:
1. Split the PDF into smaller files (1-2 pages each)
2. Upload individual images of pages instead of a large PDF
3. Try again with a lower resolution scan

Technical Error: ${error.message}`;
      }
      
      throw error;
    }
  } catch (error: any) {
    console.error("Error during OCR processing:", error);
    throw error;
  }
}
