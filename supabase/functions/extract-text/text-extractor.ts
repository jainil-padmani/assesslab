
/**
 * Main text extraction module that brings together functionality from utility modules
 */
import { validateImageUrl, downloadImageWithRetry } from "./utils/image-validation.ts";
import { processZipFile, validateZipContents } from "./utils/zip-processing.ts";
import { getSystemPrompt, performBatchOcr, performSingleImageOcr } from "./utils/ocr-processing.ts";
import { extractTextFromTextFile } from "./utils/text-file-processing.ts";

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
    
    // Process the ZIP file to extract images
    const imageFiles = await processZipFile(zipUrl);
    
    // Validate that all images are in supported formats
    const allValid = validateZipContents(imageFiles);
    if (!allValid) {
      console.warn("Some images in the ZIP file have unsupported formats. This may cause OCR issues.");
    }
    
    // Use GPT-4o's vision capabilities for OCR on all pages
    try {
      return await performBatchOcr(imageFiles, apiKey, systemPrompt);
    } catch (apiError) {
      console.error("Error during OpenAI API call:", apiError);
      
      // If we have multiple images, try processing in smaller batches
      if (imageFiles.length > 5) {
        console.log("Trying with fewer images due to API error...");
        
        // Just use first 5 images for simplicity in fallback
        const reducedImageFiles = imageFiles.slice(0, 5);
        
        try {
          console.log("Trying fallback with reduced image batch...");
          const fallbackText = await performBatchOcr(reducedImageFiles, apiKey, systemPrompt, 5);
          
          console.log("OCR extraction with reduced batch successful");
          return fallbackText + "\n\n[Note: Only partial document processing was completed due to technical limitations]";
        } catch (fallbackError) {
          console.error("Fallback OCR also failed:", fallbackError);
          throw fallbackError;
        }
      }
      
      throw apiError;
    }
  } catch (error) {
    console.error("Error processing ZIP file:", error);
    throw error;
  }
}

/**
 * Extracts text from a file using GPT-4o's vision capabilities
 */
export async function extractTextFromFile(
  fileUrl: string, 
  apiKey: string, 
  systemPrompt: string,
  userPrompt?: string
): Promise<string> {
  try {
    console.log("Processing file for OCR extraction:", fileUrl);
    
    // Validate the image URL and get the final URL after any redirects
    try {
      fileUrl = await validateImageUrl(fileUrl);
    } catch (validationError) {
      console.warn("Image URL validation failed, will attempt direct download:", validationError.message);
    }
    
    // Attempt to download the image with retries to verify it's accessible
    try {
      console.log("Downloading image directly before OCR processing");
      await downloadImageWithRetry(fileUrl);
      console.log("Image download verification successful");
    } catch (downloadError) {
      console.warn("Direct image download test failed:", downloadError.message);
      console.log("Proceeding with OCR using the URL directly...");
    }
    
    // Perform OCR on the single image
    return await performSingleImageOcr(fileUrl, apiKey, systemPrompt, userPrompt);
  } catch (error) {
    console.error("Error during OCR processing:", error);
    throw error;
  }
}

// Export utility functions from modules
export { 
  getSystemPrompt,
  extractTextFromTextFile
};
