
import { extractTextFromImageFile } from "./file-extractor.ts";
import { cleanUrlForApi } from "../utils/image-processing.ts";

/**
 * Extract text from a ZIP file containing images
 * Optimized to use direct URLs instead of base64 conversion
 */
export async function extractTextFromZip(zipUrl: string, apiKey: string, systemPrompt: string = ''): Promise<string> {
  try {
    console.log(`Processing ZIP URL: ${zipUrl}`);
    
    // Clean the ZIP URL by removing query parameters
    const cleanedZipUrl = cleanUrlForApi(zipUrl);
    console.log(`Using cleaned ZIP URL for OCR processing: ${cleanedZipUrl}`);
    
    // Extract text from the ZIP using OpenAI's vision capabilities
    // No base64 conversion - use URL directly
    const extractedText = await extractTextFromImageFile(
      cleanedZipUrl,
      apiKey,
      systemPrompt || "You are an OCR tool optimized for extracting text from documents. Extract all visible text content accurately."
    );
    
    console.log(`Successfully extracted ${extractedText.length} characters from ZIP contents`);
    return extractedText;
  } catch (error: any) {
    console.error("Error in ZIP handling:", error);
    
    // Provide a more helpful error message
    if (error.message?.includes("Timeout") || error.message?.includes("invalid_image_format")) {
      throw new Error(`ZIP file may be too large or contain too many images. Consider reducing the number of pages in your document.`);
    }
    
    throw new Error(`Error in ZIP handling: ${error.message || "Unknown error"}`);
  }
}
