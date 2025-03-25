
/**
 * Service for processing batches of images
 */
import { BedrockService } from "./bedrock-service.ts";
import { processBatch } from "../utils/batch-processor.ts";
import { extractTextFromResponse } from "../utils/response-processor.ts";

/**
 * Process a single batch of up to 4 images with Claude Vision
 */
export async function processSingleBatch(
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
  try {
    // Process the batch of images
    const { imageContents, failedImages } = await processBatch(batchUrls);
    
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
      adjustedPrompt += `\n\nNote: ${failedImages.length} out of ${batchUrls.length} images could not be processed. Analysis is based only on the available ${imageContents.length} images.`;
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
      
      return extractTextFromResponse(response);
    } catch (error) {
      console.error("Error in Bedrock API call:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in processSingleBatch:", error);
    throw error;
  }
}
