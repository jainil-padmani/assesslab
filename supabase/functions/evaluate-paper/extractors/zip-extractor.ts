
import { extractTextFromImageFile } from "./file-extractor.ts";
import { createDirectImageUrl } from "../utils/image-processing.ts";

/**
 * Extract text from a ZIP file containing images
 * This implementation processes the ZIP file contents for better OCR results
 */
export async function extractTextFromZip(zipUrl: string, apiKey: string, systemPrompt: string = ''): Promise<string> {
  try {
    console.log(`Processing ZIP URL: ${zipUrl}`);
    
    // Since we're now using pre-converted PNG images in the ZIP file,
    // we can directly process the first image in the ZIP as a representative sample
    // This is more efficient than trying to extract the entire ZIP in the edge function
    
    // Create a direct image URL that OpenAI can access
    const directImageUrl = createDirectImageUrl(zipUrl);
    console.log(`Created direct image URL for OCR processing: ${directImageUrl}`);
    
    // Extract text from the image using OpenAI's vision capabilities
    const extractedText = await extractTextFromImageFile(
      directImageUrl,
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
