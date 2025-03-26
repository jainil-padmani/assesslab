
/**
 * Utilities for processing batches of images
 */
import { cleanUrlForApi } from "./image-processing.ts";

/**
 * Process a single batch of images, fetching each image and preparing it for vision models
 */
export async function processBatch(
  batchUrls: string[]
): Promise<{
  imageContents: any[];
  failedImages: {
    index: number;
    url: string;
    error: string;
  }[];
}> {
  // Clean all URLs by removing query parameters first
  const validUrls = batchUrls
    .filter(url => !!url)
    .map(url => cleanUrlForApi(url));
  
  if (validUrls.length === 0) {
    throw new Error("No valid image URLs in batch");
  }
  
  console.log(`Processing batch with ${validUrls.length} images`);
  
  // Process each image (up to 4 images max for Claude 3.5)
  const imageContents: any[] = [];
  const failedImages: {
    index: number;
    url: string;
    error: string;
  }[] = [];
  
  for (let i = 0; i < validUrls.length; i++) {
    try {
      console.log(`Processing image ${i+1}/${validUrls.length}: ${validUrls[i].substring(0, 100)}...`);
      
      // Add timeout to fetch requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        // Fetch the image
        const response = await fetch(validUrls[i], {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache' // Additional cache control
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.error(`Failed to fetch image ${i+1}: ${response.status} ${response.statusText}`);
          failedImages.push({
            index: i,
            url: validUrls[i],
            error: `HTTP status ${response.status} ${response.statusText}`
          });
          continue;
        }
        
        // Get content type and validate it's an image
        const contentType = response.headers.get('content-type') || '';
        console.log(`URL content type: ${contentType}`);
        
        if (!contentType.startsWith('image/') && !contentType.includes('application/octet-stream')) {
          console.warn(`URL ${i+1} is not an image (${contentType}), skipping`);
          failedImages.push({
            index: i,
            url: validUrls[i],
            error: `Invalid content type: ${contentType}`
          });
          continue;
        }
        
        // Explicitly reject PDFs
        if (contentType.includes('pdf') || validUrls[i].toLowerCase().endsWith('.pdf') || validUrls[i].includes('.pdf?')) {
          console.error(`URL ${i+1} is a PDF. PDFs must be converted to images first.`);
          failedImages.push({
            index: i,
            url: validUrls[i],
            error: "PDF detected. PDFs must be converted to images first."
          });
          continue;
        }
        
        // Get image data as array buffer
        const imageData = await response.arrayBuffer();
        
        // Check if we actually got data
        if (!imageData || imageData.byteLength === 0) {
          console.error(`Image ${i+1} returned empty data`);
          failedImages.push({
            index: i,
            url: validUrls[i],
            error: "Empty response data"
          });
          continue;
        }
        
        // Convert to base64 - FIXED: Using a safer approach to prevent stack overflow
        // Instead of using String.fromCharCode with spread operator which can cause stack overflow
        // We'll use a chunked approach to convert the array buffer to base64
        let binary = '';
        const bytes = new Uint8Array(imageData);
        const chunkSize = 1024; // Process in smaller chunks to avoid stack overflow
        
        for (let j = 0; j < bytes.byteLength; j += chunkSize) {
          const chunk = bytes.subarray(j, Math.min(j + chunkSize, bytes.byteLength));
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        
        const base64 = btoa(binary);
        const mimeType = contentType || 'image/jpeg';
        
        console.log(`Successfully processed image ${i+1}: ${base64.substring(0, 50)}... (${imageData.byteLength} bytes)`);
        
        // Add image to content array in the correct format for Bedrock/Claude
        imageContents.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType,
            data: base64
          }
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error(`Error fetching image ${i+1}:`, fetchError);
        failedImages.push({
          index: i,
          url: validUrls[i],
          error: fetchError instanceof Error ? fetchError.message : "Unknown error"
        });
      }
    } catch (error) {
      console.error(`Error processing image ${i+1}:`, error);
      failedImages.push({
        index: i,
        url: validUrls[i],
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
  
  return { imageContents, failedImages };
}
