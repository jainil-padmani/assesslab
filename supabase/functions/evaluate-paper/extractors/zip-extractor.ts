
import JSZip from "https://deno.land/x/jszip@0.11.0/mod.ts";
import { extractTextFromImageFile } from "./file-extractor.ts";

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
    const zip = new JSZip();
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
      );
    });
    
    if (imageFiles.length === 0) {
      throw new Error("No image files found in the ZIP file");
    }
    
    console.log(`Found ${imageFiles.length} image files in ZIP`);
    
    // Extract text from each image
    let allText = '';
    for (let i = 0; i < imageFiles.length; i++) {
      const fileName = imageFiles[i];
      console.log(`Processing image ${i + 1}/${imageFiles.length}: ${fileName}`);
      
      try {
        // Extract the file from the ZIP
        const fileData = await zip.file(fileName)?.async('blob');
        if (!fileData) {
          console.warn(`Could not extract file ${fileName} from ZIP`);
          continue;
        }
        
        // Create a URL for the image
        const url = URL.createObjectURL(fileData);
        
        // Extract text from the image
        const text = await extractTextFromImageFile(
          url, 
          apiKey, 
          systemPrompt, 
          `Extract all text from page ${i + 1} of the document:`
        );
        
        // Clean up URL
        URL.revokeObjectURL(url);
        
        // Add page number and text to the result
        allText += `\n\n--- PAGE ${i + 1} ---\n\n${text}`;
      } catch (fileError) {
        console.error(`Error processing file ${fileName}:`, fileError);
        // Continue with other files even if one fails
      }
    }
    
    if (!allText) {
      throw new Error("Failed to extract any text from the images in the ZIP file");
    }
    
    return allText.trim();
  } catch (error: any) {
    console.error("Error extracting text from ZIP:", error);
    throw new Error(`Error extracting text from ZIP: ${error.message || "Unknown error"}`);
  }
}
