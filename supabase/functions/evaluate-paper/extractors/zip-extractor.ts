
import * as JSZip from "https://deno.land/x/jszip@0.11.0/mod.ts";
import { extractTextFromImageFile } from "./file-extractor.ts";
import { createDirectImageUrl } from "../utils/image-processing.ts";

/**
 * Extract text from a ZIP file containing images
 */
export async function extractTextFromZip(zipUrl: string, apiKey: string, systemPrompt: string = ''): Promise<string> {
  try {
    if (!zipUrl) {
      throw new Error("No ZIP URL provided");
    }
    
    console.log(`Extracting text from ZIP file: ${zipUrl}`);
    
    // Download the ZIP file
    const zipResponse = await fetch(zipUrl);
    if (!zipResponse.ok) {
      throw new Error(`Failed to download ZIP file: ${zipResponse.status} ${zipResponse.statusText}`);
    }
    
    const zipData = await zipResponse.arrayBuffer();
    if (!zipData || zipData.byteLength === 0) {
      throw new Error("Downloaded ZIP file is empty");
    }
    
    // Load the ZIP file
    const zip = new JSZip.JSZip();
    await zip.loadAsync(zipData);
    
    // Find image files in the ZIP
    const imageFiles = Object.keys(zip.files).filter(fileName => {
      const lowerFileName = fileName.toLowerCase();
      return (
        lowerFileName.endsWith('.jpg') || 
        lowerFileName.endsWith('.jpeg') || 
        lowerFileName.endsWith('.png') ||
        lowerFileName.endsWith('.gif') ||
        lowerFileName.endsWith('.webp')
      ) && !zip.files[fileName].dir; // Ensure it's not a directory
    });
    
    if (imageFiles.length === 0) {
      throw new Error("No image files found in the ZIP file");
    }
    
    console.log(`Found ${imageFiles.length} image files in ZIP`);
    
    // Sort files by name to maintain page order
    imageFiles.sort();
    
    // Extract text from each image
    let allText = '';
    let processedCount = 0;
    const batchSize = 3; // Process images in smaller batches to prevent memory issues
    
    for (let i = 0; i < imageFiles.length; i += batchSize) {
      const batch = imageFiles.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(async (fileName, batchIndex) => {
        const pageIndex = i + batchIndex + 1;
        console.log(`Processing image ${pageIndex}/${imageFiles.length}: ${fileName}`);
        
        try {
          // Extract the file from the ZIP
          const fileData = await zip.files[fileName]?.async('blob');
          if (!fileData) {
            console.warn(`Could not extract file ${fileName} from ZIP`);
            return `\n\n--- PAGE ${pageIndex} ---\n\n[Error: Failed to extract image]`;
          }
          
          // Process the image with OpenAI
          const userPrompt = `Extract all text from page ${pageIndex} of the document, preserving formatting:`;
          
          // Create a direct URL for the image instead of using URL.createObjectURL
          // which is not available in Deno runtime
          const dataUrl = await createDirectImageUrl(fileData);
          
          // Extract text from the image
          const text = await extractTextFromImageFile(
            dataUrl, 
            apiKey, 
            systemPrompt, 
            userPrompt
          );
          
          return `\n\n--- PAGE ${pageIndex} ---\n\n${text}`;
        } catch (fileError) {
          console.error(`Error processing file ${fileName}:`, fileError);
          return `\n\n--- PAGE ${pageIndex} ---\n\n[Error: ${fileError.message || "Unknown error"}]`;
        }
      }));
      
      // Add batch results to the overall text
      allText += batchResults.join('');
      
      // Update progress
      processedCount += batch.length;
      console.log(`Progress: ${processedCount}/${imageFiles.length} images processed`);
      
      // Small delay between batches to allow for garbage collection
      if (i + batchSize < imageFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    if (!allText.trim()) {
      throw new Error("Failed to extract any text from the images in the ZIP file");
    }
    
    return allText.trim();
  } catch (error: any) {
    console.error("Error extracting text from ZIP:", error);
    throw new Error(`Error extracting text from ZIP: ${error.message || "Unknown error"}`);
  }
}
