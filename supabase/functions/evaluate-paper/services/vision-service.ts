/**
 * Service for processing images with Claude Vision
 */
import { BedrockService } from "./bedrock-service.ts";
import { cleanUrlForApi } from "../utils/image-processing.ts";
import { processSingleBatch } from "./batch-service.ts";

/**
 * Process images with Claude 3.5 Vision models through AWS Bedrock
 * Handles PDF conversion and batching of images for better OCR processing
 */
export async function processImagesWithVision(
  bedrockService: BedrockService,
  params: {
    prompt: string;
    imageUrls: string[];
    max_tokens?: number;
    temperature?: number;
    system?: string;
    anthropic_version?: string;
  }
): Promise<string> {
  try {
    // Validate input
    if (!params.imageUrls || !Array.isArray(params.imageUrls) || params.imageUrls.length === 0) {
      throw new Error("No image URLs provided");
    }
    
    console.log(`Processing ${params.imageUrls.length} images with Claude Vision`);
    
    // Check if URLs are in JSON string format and parse them
    let imageUrls = params.imageUrls;
    if (params.imageUrls.length === 1 && typeof params.imageUrls[0] === 'string' && params.imageUrls[0].startsWith('[')) {
      try {
        const parsedUrls = JSON.parse(params.imageUrls[0]);
        if (Array.isArray(parsedUrls)) {
          imageUrls = parsedUrls;
          console.log(`Parsed JSON string into ${imageUrls.length} image URLs`);
        }
      } catch (parseError) {
        console.log("Not a valid JSON string of URLs, processing as regular URL");
      }
    }
    
    // Reject any PDF URLs directly - they must be converted to images first
    for (const url of imageUrls) {
      if (typeof url === 'string' && (url.toLowerCase().endsWith('.pdf') || url.includes('.pdf?'))) {
        throw new Error("PDF URL detected. PDFs must be converted to images before processing with Claude Vision.");
      }
    }
    
    // Process images in batches of 4 (Claude Vision limit)
    const batchSize = 4;
    const batches = [];
    
    // Create batches of up to 4 images each
    for (let i = 0; i < imageUrls.length; i += batchSize) {
      batches.push(imageUrls.slice(i, i + batchSize));
    }
    
    console.log(`Split ${imageUrls.length} images into ${batches.length} batches of max ${batchSize} images each`);
    
    // If there's only one batch, process it directly
    if (batches.length === 1) {
      return await processSingleBatch(bedrockService, batches[0], params);
    }
    
    // Otherwise, process each batch separately and combine results
    console.log(`Processing ${batches.length} batches sequentially`);
    let combinedResults = '';
    let batchNumber = 1;
    
    for (const batch of batches) {
      try {
        console.log(`Processing batch ${batchNumber}/${batches.length} with ${batch.length} images`);
        
        // Modify prompt to indicate which batch is being processed
        const batchPrompt = `${params.prompt}\n\n[This is batch ${batchNumber} of ${batches.length}]`;
        
        // Process the batch
        const batchResult = await processSingleBatch(
          bedrockService, 
          batch, 
          {
            ...params,
            prompt: batchPrompt
          }
        );
        
        // Add batch results to combined results
        combinedResults += `\n\n--- BATCH ${batchNumber} RESULTS ---\n\n${batchResult}`;
        batchNumber++;
      } catch (batchError) {
        console.error(`Error processing batch ${batchNumber}:`, batchError);
        combinedResults += `\n\n--- BATCH ${batchNumber} ERROR ---\n\n${batchError.message}`;
        batchNumber++;
      }
    }
    
    console.log(`Successfully processed all ${batches.length} batches`);
    return combinedResults;
  } catch (error) {
    console.error("Error in processImagesWithVision:", error);
    throw error;
  }
}
