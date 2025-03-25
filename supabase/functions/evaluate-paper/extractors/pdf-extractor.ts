
/**
 * Specialized extractor for PDF files
 */
import { createBedrockService } from "../services/bedrock-service.ts";
import { getDocumentPagesAsImages } from "../services/document-converter.ts";
import { extractTextFromImageFile } from "./image-extractor.ts";

/**
 * Extract text from a PDF file by first converting it to images
 */
export async function extractTextFromPdf(
  pdfUrl: string,
  credentials: { accessKeyId: string, secretAccessKey: string, region: string },
  systemPrompt: string = '',
  userPrompt?: string
): Promise<string> {
  try {
    console.log("PDF file detected, converting to images first before OCR");
    
    // Get the pre-converted images
    const imageUrls = await getDocumentPagesAsImages(pdfUrl);
    
    if (!imageUrls || imageUrls.length === 0) {
      throw new Error("Failed to convert PDF to images");
    }
    
    console.log(`Successfully converted PDF to ${imageUrls.length} images, processing for OCR`);
    
    // Process the converted images using the image extractor
    return await extractTextFromImageFile(
      JSON.stringify(imageUrls),
      credentials,
      systemPrompt || "You are an OCR tool optimized for extracting text from documents. Extract all visible text content accurately.",
      userPrompt
    );
  } catch (pdfError) {
    console.error("Error converting PDF to images:", pdfError);
    throw new Error(`PDF conversion error: ${pdfError.message}`);
  }
}
