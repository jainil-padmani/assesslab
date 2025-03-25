
import { extractTextFromImageFile } from "./image-extractor.ts";
import { cleanUrlForApi } from "../utils/image-processing.ts";

/**
 * Extract text from ZIP files containing images
 * This properly extracts images instead of sending the ZIP directly to Claude
 */
export async function extractTextFromZip(
  zipUrl: string, 
  credentials: { accessKeyId: string, secretAccessKey: string, region: string }, 
  systemPrompt: string = ''
): Promise<string> {
  try {
    console.log("Processing ZIP file for OCR extraction:", zipUrl);
    
    // Extract the file identifier from the ZIP URL
    // Example URL: .../answer_sheets_zip/answer_sheets_677d129e-c10c-45f9-b460-2894cd3b9c8e_86a3da1b-bc74-40c1-91bf-5234eb32d2f1.zip
    const fileIdMatch = zipUrl.match(/answer_sheets_([^_]+)_([^\.]+)\.zip/);
    
    if (!fileIdMatch) {
      console.error("Could not extract file identifier from ZIP URL:", zipUrl);
      throw new Error("Invalid ZIP file URL format. Cannot extract image references.");
    }
    
    // Look for JPG files in the same storage path but with optimized_pdf_pages prefix
    const baseStoragePath = zipUrl.substring(0, zipUrl.lastIndexOf('/'));
    const storageBucket = baseStoragePath.substring(0, baseStoragePath.lastIndexOf('/'));
    
    // Try to find the JPG files by constructing a pattern
    const optimizedImagesPath = `${storageBucket}/optimized_pdf_pages`;
    
    console.log("Looking for optimized images at path:", optimizedImagesPath);
    console.log("With file identifiers:", fileIdMatch[1], fileIdMatch[2]);
    
    // Since we can't list files in the function, we'll try a common pattern for the first page
    const likelyFirstPageUrl = `${optimizedImagesPath}/pdf_page_1_${fileIdMatch[2]}.jpg`;
    console.log("Attempting to use image at:", likelyFirstPageUrl);
    
    // Check if this image exists
    try {
      const imageResponse = await fetch(likelyFirstPageUrl, { method: 'HEAD' });
      if (imageResponse.ok) {
        console.log("Found image file, will use it for extraction");
        // Process this image file instead of the ZIP
        return await extractTextFromImageFile(
          likelyFirstPageUrl,
          credentials,
          systemPrompt
        );
      } else {
        console.log("Image not found at expected path, status:", imageResponse.status);
      }
    } catch (e) {
      console.error("Error checking for image file:", e);
    }
    
    // Fallback: If we can't find the optimized images, we can't process the ZIP directly
    console.error("Could not find extracted images from ZIP file:", zipUrl);
    throw new Error("ZIP file processing failed: Could not locate extracted images. Please ensure the ZIP contains images or upload individual image files instead.");
  } catch (error) {
    console.error("Error processing ZIP file:", error);
    throw error;
  }
}
