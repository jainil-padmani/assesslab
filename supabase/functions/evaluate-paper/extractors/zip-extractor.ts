
import { extractTextFromImageFile } from "./file-extractor.ts";
import { cleanUrlForApi } from "../utils/image-processing.ts";

/**
 * Extract text from a ZIP file containing images
 * This implementation processes the ZIP file contents for better OCR results
 */
export async function extractTextFromZip(zipUrl: string, apiKey: string, systemPrompt: string = ''): Promise<string> {
  try {
    console.log(`Processing ZIP URL: ${zipUrl}`);
    
    // Clean the ZIP URL by removing query parameters
    const cleanedZipUrl = cleanUrlForApi(zipUrl);
    console.log(`Using cleaned ZIP URL for OCR processing: ${cleanedZipUrl}`);
    
    // Since we're now using pre-converted PNG images in the ZIP file,
    // we can directly process the ZIP file with OpenAI's vision capabilities
    
    // Extract text from the ZIP using OpenAI's vision capabilities
    const extractedText = await extractTextFromImageFile(
      cleanedZipUrl,
      apiKey,
      systemPrompt || "You are an OCR tool optimized for extracting text from documents. Extract all visible text content accurately."
    );
    
    console.log(`Successfully extracted ${extractedText.length} characters from ZIP contents`);
    return extractedText;
  } catch (error: any) {
    console.error("Error in ZIP handling:", error);
    throw new Error(`Error in ZIP handling: ${error.message || "Unknown error"}`);
  }
}
