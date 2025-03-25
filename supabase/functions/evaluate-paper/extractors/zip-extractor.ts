
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
    const zip = new JSZip();
    await zip.loadAsync(zipData);
    
    // Find image files in the ZIP - specifically looking for PNG files
    // since our conversion process should have created PNGs
    const imageFiles = Object.keys(zip.files).filter(fileName => {
      const lowerFileName = fileName.toLowerCase();
      return (
        lowerFileName.endsWith('.png') || 
        lowerFileName.endsWith('.jpg') || 
        lowerFileName.endsWith('.jpeg') || 
        lowerFileName.endsWith('.gif') ||
        lowerFileName.endsWith('.webp')
      ) && !zip.files[fileName].dir; // Ensure it's not a directory
    });
    
    console.log(`Found ${imageFiles.length} image files in ZIP:`, imageFiles);
    
    if (imageFiles.length === 0) {
      // Log the list of all files in ZIP for debugging
      const allFiles = Object.keys(zip.files);
      console.log("ZIP contains these files:", allFiles);
      throw new Error("No image files found in the ZIP file");
    }
    
    // Sort files by name to maintain page order - numeric sorting for page_001.png etc.
    imageFiles.sort((a, b) => {
      // Extract page numbers if present
      const numA = a.match(/(\d+)/);
      const numB = b.match(/(\d+)/);
      
      if (numA && numB) {
        return parseInt(numA[0]) - parseInt(numB[0]);
      }
      return a.localeCompare(b);
    });
    
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
          
          // Determine the correct MIME type based on file extension
          const extension = fileName.split('.').pop()?.toLowerCase() || '';
          let mimeType = 'image/png'; // Default
          
          if (extension === 'jpg' || extension === 'jpeg') {
            mimeType = 'image/jpeg';
          } else if (extension === 'webp') {
            mimeType = 'image/webp';
          } else if (extension === 'gif') {
            mimeType = 'image/gif';
          }
          
          // Create a new blob with the proper mime type
          const imageBlob = new Blob([await fileData.arrayBuffer()], { type: mimeType });
          
          // Process the image with OpenAI
          const userPrompt = `Extract all text from page ${pageIndex} of the document, preserving formatting:`;
          
          // Create a direct URL for the image
          const dataUrl = await createDirectImageUrl(imageBlob);
          console.log(`Created data URL for image ${pageIndex}, length: ${dataUrl.length}`);
          
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
