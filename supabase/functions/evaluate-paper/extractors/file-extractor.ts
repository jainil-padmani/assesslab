
/**
 * Main file extractor that orchestrates the extraction process
 * Delegates to specialized extractors based on file type
 */
import { isPdfDocument, isZipDocument } from "../utils/document-detection.ts";
import { extractTextFromPdf } from "./pdf-extractor.ts";
import { extractTextFromZip } from "./zip-extractor.ts";
import { extractTextFromDirectFile } from "./direct-file-extractor.ts";
import { extractTextFromImageFile } from "./image-extractor.ts";

/**
 * Extract text from a file using Claude 3.5 Vision
 * Detects file type and delegates to the appropriate specialized extractor
 */
export async function extractTextFromFile(
  fileUrl: string, 
  credentials: { accessKeyId: string, secretAccessKey: string, region: string }, 
  systemPrompt: string = '', 
  userPrompt?: string
): Promise<string> {
  try {
    if (!fileUrl) {
      throw new Error("No file URL provided");
    }
    
    console.log(`Extracting text from file: ${fileUrl}`);
    
    // Check if this is a ZIP file - if so, redirect to specialized extractor
    if (isZipDocument(fileUrl)) {
      console.log("ZIP file detected, redirecting to image extraction function");
      return await extractTextFromZip(
        fileUrl,
        credentials,
        systemPrompt || "You are an OCR tool optimized for extracting text from documents. Extract all visible text content accurately."
      );
    }
    
    // Check if this is a PDF file - if so, use the specialized PDF extractor
    if (isPdfDocument(fileUrl)) {
      console.log("PDF file detected, using PDF extractor");
      return await extractTextFromPdf(
        fileUrl,
        credentials,
        systemPrompt || "You are an OCR tool optimized for extracting text from documents. Extract all visible text content accurately.",
        userPrompt
      );
    }
    
    // For other file types, use the direct file extractor
    console.log("Using direct file extractor for non-PDF, non-ZIP file");
    return await extractTextFromDirectFile(
      fileUrl,
      credentials,
      systemPrompt,
      userPrompt
    );
  } catch (error: any) {
    console.error("Error in extractTextFromFile:", error);
    throw error;
  }
}

// Re-export functions for backward compatibility
export { extractTextFromImageFile, extractTextFromZip, extractTextFromPdf };
