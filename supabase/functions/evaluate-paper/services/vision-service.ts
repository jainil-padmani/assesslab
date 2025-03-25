
/**
 * Service for processing images with Claude Vision
 */
import { BedrockService } from "./bedrock-service.ts";

/**
 * Process images with Claude 3.5 Vision models through AWS Bedrock
 * Following AWS Bedrock documentation for image processing
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
  // Validate input
  if (!params.imageUrls || !Array.isArray(params.imageUrls) || params.imageUrls.length === 0) {
    throw new Error("No image URLs provided");
  }
  
  console.log(`Processing ${params.imageUrls.length} images with Claude Vision`);
  
  // Process each image (up to 4 images max for Claude 3.5)
  const imageContents = [];
  const failedImages = [];
  const maxImages = Math.min(params.imageUrls.length, 4);
  
  for (let i = 0; i < maxImages; i++) {
    try {
      console.log(`Processing image ${i+1}/${maxImages}: ${params.imageUrls[i]}`);
      
      // Add timeout to fetch requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        // Fetch the image
        const response = await fetch(params.imageUrls[i], {
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
            url: params.imageUrls[i],
            error: `HTTP status ${response.status} ${response.statusText}`
          });
          continue;
        }
        
        // Get content type and validate it's an image
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('image/') && !contentType.includes('application/octet-stream')) {
          console.warn(`URL ${i+1} (${params.imageUrls[i]}) is not an image (${contentType}), attempting to process anyway`);
        }
        
        // Get image data as array buffer
        const imageData = await response.arrayBuffer();
        
        // Check if we actually got data
        if (!imageData || imageData.byteLength === 0) {
          console.error(`Image ${i+1} (${params.imageUrls[i]}) returned empty data`);
          failedImages.push({
            index: i,
            url: params.imageUrls[i],
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
        console.error(`Error fetching image ${i+1} (${params.imageUrls[i]}):`, fetchError);
        failedImages.push({
          index: i,
          url: params.imageUrls[i],
          error: fetchError instanceof Error ? fetchError.message : "Unknown error"
        });
      }
    } catch (error) {
      console.error(`Error processing image ${i+1} (${params.imageUrls[i]}):`, error);
      failedImages.push({
        index: i,
        url: params.imageUrls[i],
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
      errorDetails += `- Image ${img.index + 1} (${img.url}): ${img.error}\n`;
    });
    
    throw new Error(errorDetails);
  }
  
  // Adjust prompt to include information about failed images if any
  let adjustedPrompt = params.prompt;
  if (failedImages.length > 0) {
    adjustedPrompt += `\n\nNote: ${failedImages.length} out of ${params.imageUrls.length} images could not be processed. Analysis is based only on the available ${imageContents.length} images.`;
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
