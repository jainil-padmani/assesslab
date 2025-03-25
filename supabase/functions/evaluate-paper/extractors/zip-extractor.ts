
import { extractTextFromImageFile } from "./file-extractor.ts";
import { cleanUrlForApi } from "../utils/image-processing.ts";

/**
 * Extract text from document images directly without a ZIP file
 * Instead of using ZIP files, we process images directly
 */
export async function extractTextFromZip(zipUrl: string, apiKey: string, systemPrompt: string = ''): Promise<string> {
  try {
    console.log(`Processing document URL: ${zipUrl}`);
    
    // Clean the URL by removing query parameters
    const cleanedUrl = cleanUrlForApi(zipUrl);
    console.log(`Using cleaned URL for OCR processing: ${cleanedUrl}`);
    
    // Extract text directly using OpenAI's vision capabilities
    // No ZIP extraction - process images directly
    const extractedText = await extractTextFromImageFile(
      cleanedUrl,
      apiKey,
      systemPrompt || "You are an OCR tool optimized for extracting text from documents. Extract all visible text content accurately."
    );
    
    console.log(`Successfully extracted ${extractedText.length} characters from document contents`);
    return extractedText;
  } catch (error: any) {
    console.error("Error in document handling:", error);
    
    // Provide a more helpful error message
    if (error.message?.includes("Timeout") || error.message?.includes("invalid_image_format")) {
      throw new Error(`Document may be too large or contain too many images. Consider reducing the number of pages in your document.`);
    }
    
    throw new Error(`Error in document handling: ${error.message || "Unknown error"}`);
  }
}
