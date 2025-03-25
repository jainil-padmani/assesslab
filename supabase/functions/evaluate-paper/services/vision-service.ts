
/**
 * Service for processing images with Claude Vision
 */
import { BedrockService } from "./bedrock-service.ts";
import { cleanUrlForApi } from "../utils/image-processing.ts";

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

/**
 * Process a single batch of up to 4 images
 */
async function processSingleBatch(
  bedrockService: BedrockService,
  batchUrls: string[],
  params: {
    prompt: string;
    max_tokens?: number;
    temperature?: number;
    system?: string;
    anthropic_version?: string;
  }
): Promise<string> {
  // Clean all URLs by removing query parameters first
  const validUrls = batchUrls
    .filter(url => !!url)
    .map(url => cleanUrlForApi(url));
  
  if (validUrls.length === 0) {
    throw new Error("No valid image URLs in batch");
  }
  
  console.log(`Processing batch with ${validUrls.length} images`);
  
  // Process each image (up to 4 images max for Claude 3.5)
  const imageContents = [];
  const failedImages = [];
  
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
        if (contentType.includes('pdf') || validUrls[i].toLowerCase().endsWith('.pdf')) {
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
        
        // Convert to base64
        const base64 = btoa(String.fromCharCode(...new Uint8Array(imageData)));
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
  
  // Check if we have any valid images
  if (imageContents.length === 0) {
    console.error("Failed to process all provided images:", failedImages);
    
    // Detailed error message with all failed images for debugging
    let errorDetails = "Failed to process any of the provided images:\n";
    failedImages.forEach(img => {
      errorDetails += `- Image ${img.index + 1} (${img.url.substring(0, 100)}...): ${img.error}\n`;
    });
    
    throw new Error(errorDetails);
  }
  
  // Adjust prompt to include information about failed images if any
  let adjustedPrompt = params.prompt;
  if (failedImages.length > 0) {
    adjustedPrompt += `\n\nNote: ${failedImages.length} out of ${validUrls.length} images could not be processed. Analysis is based only on the available ${imageContents.length} images.`;
  }
  
  // Create the message with text and images following Bedrock/Claude format
  const userMessage = {
    role: "user",
    content: [
      { type: "text", text: adjustedPrompt },
      ...imageContents
    ]
  };
  
  try {
    console.log(`Invoking Bedrock with ${imageContents.length} images`);
    
    // Use a proper API format for Bedrock's Claude models
    const response = await bedrockService.invokeModel({
      messages: [userMessage],
      max_tokens: params.max_tokens || 4000,
      temperature: params.temperature || 0.2,
      system: params.system,
      anthropic_version: "bedrock-2023-05-31"
    });
    
    console.log("Response structure:", JSON.stringify(Object.keys(response)));
    
    // Extract text from the response based on Bedrock/Claude format
    if (!response) {
      console.error("Empty response from Bedrock API");
      throw new Error("Empty response from Bedrock API");
    }
    
    // Log the full response for debugging
    console.log("Full Bedrock response:", JSON.stringify(response).substring(0, 500) + "...");
    
    // Handle different response formats from Bedrock API
    let textContent = "";
    
    // Check for Claude format
    if (response.output && response.output.content) {
      const contents = response.output.content;
      
      if (Array.isArray(contents)) {
        // Find the text content in the array
        for (const item of contents) {
          if (item.type === "text") {
            textContent = item.text;
            break;
          }
        }
      } else if (typeof contents === "string") {
        textContent = contents;
      }
    } 
    // Alternative format - directly in content
    else if (response.content) {
      if (Array.isArray(response.content)) {
        for (const item of response.content) {
          if (item.type === "text") {
            textContent = item.text;
            break;
          }
        }
      } else if (typeof response.content === "string") {
        textContent = response.content;
      }
    }
    // Try completion format
    else if (response.completion) {
      textContent = response.completion;
    }
    // Try message format
    else if (response.message && response.message.content) {
      textContent = typeof response.message.content === "string" 
        ? response.message.content
        : JSON.stringify(response.message.content);
    }
    
    if (!textContent) {
      console.error("Could not extract text content from response format:", JSON.stringify(response));
      throw new Error("Could not extract text from Bedrock API response");
    }
    
    console.log(`Successfully extracted text: ${textContent.substring(0, 100)}...`);
    return textContent;
  } catch (error) {
    console.error("Error in Bedrock API call:", error);
    throw error;
  }
}
