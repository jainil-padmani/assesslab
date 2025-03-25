
import { createBedrockService } from "../services/bedrock-service.ts";
import { urlToBase64, cleanUrlForApi } from "../utils/image-processing.ts";
import { createImageBatches, cleanImageUrlsForProcessing } from "../utils/image-batch-processing.ts";

/**
 * Extract text from a file using Claude 3.5 Vision
 * With improved memory handling for large files
 */
export async function extractTextFromFile(fileUrl: string, credentials: { accessKeyId: string, secretAccessKey: string, region: string }, systemPrompt: string = '', userPrompt?: string): Promise<string> {
  try {
    if (!fileUrl) {
      throw new Error("No file URL provided");
    }
    
    console.log(`Extracting text from file: ${fileUrl}`);
    
    // Check if this is a ZIP file - if so, process it as batched images
    if (/\.zip/i.test(fileUrl)) {
      console.log("ZIP file detected, redirecting to direct image processing");
      // Clean the URL by removing any query parameters
      const cleanedUrl = cleanUrlForApi(fileUrl);
      console.log(`Using cleaned URL for OCR: ${cleanedUrl}`);
      
      return await extractTextFromImageFile(
        cleanedUrl,
        credentials,
        systemPrompt || "You are an OCR tool optimized for extracting text from documents. Extract all visible text content accurately."
      );
    }
    
    // Process the image URL
    let imageData = cleanUrlForApi(fileUrl);
    console.log("Using direct image URL for processing:", imageData);
    
    const bedrockService = createBedrockService(
      credentials.accessKeyId,
      credentials.secretAccessKey,
      credentials.region
    );
    
    const promptText = userPrompt || "Extract all the text from this document, focusing on identifying question numbers and their corresponding content:";
    
    try {
      // Use Claude Vision to extract text from the image
      const extractedText = await bedrockService.processImagesWithVision({
        prompt: promptText,
        imageUrls: [imageData],
        max_tokens: 4000,
        temperature: 0.2,
        system: systemPrompt || "Extract text from the image accurately, preserving formatting."
      });
      
      console.log(`Extracted text: ${extractedText.length} characters`);
      return extractedText;
    } catch (apiError: any) {
      console.error("AWS Bedrock API error:", apiError);
      throw new Error(`OCR extraction failed: ${apiError.message || "Unknown API error"}`);
    }
  } catch (error: any) {
    console.error("Error extracting text from file:", error);
    throw new Error(`OCR extraction failed: ${error.message || "Unknown error"}`);
  }
}

/**
 * Process image files in batches directly with Claude 3.5 Vision
 * Supports batching up to 4 images per request for better efficiency
 */
export async function extractTextFromImageFile(
  fileUrl: string, 
  credentials: { accessKeyId: string, secretAccessKey: string, region: string }, 
  systemPrompt: string,
  userPrompt?: string
): Promise<string> {
  try {
    if (!fileUrl) {
      throw new Error("No file URL provided");
    }
    
    console.log("Processing images directly for OCR extraction");
    
    // Initialize Bedrock service
    const bedrockService = createBedrockService(
      credentials.accessKeyId,
      credentials.secretAccessKey,
      credentials.region
    );
    
    // For simple image URLs, just process directly
    const cleanUrl = cleanUrlForApi(fileUrl);
    console.log("Using direct URL for image processing:", cleanUrl);
    
    // For multi-page documents or batch processing if provided
    // We need to determine if this is a single image or multiple
    let imageUrls: string[] = [cleanUrl];
    
    // Check if fileUrl might be a JSON string containing multiple images
    if (fileUrl.startsWith('[') && fileUrl.endsWith(']')) {
      try {
        const parsedUrls = JSON.parse(fileUrl);
        if (Array.isArray(parsedUrls) && parsedUrls.length > 0) {
          imageUrls = cleanImageUrlsForProcessing(parsedUrls);
          console.log(`Processing ${imageUrls.length} images in batches`);
        }
      } catch (e) {
        // If parsing fails, continue with the single URL
        console.log("Not a valid JSON array, treating as single image URL");
      }
    }
    
    // Create batches of images (Claude 3.5 supports up to 4 images per request)
    const batches = createImageBatches(imageUrls);
    console.log(`Created ${batches.length} batch(es) of images`);
    
    // Process each batch and combine results
    let combinedText = '';
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i+1}/${batches.length} with ${batch.length} image(s)`);
      
      const promptText = userPrompt || 
        `Extract all the text from ${batch.length > 1 ? 'these images' : 'this image'}, preserving structure and formatting:` +
        (batches.length > 1 ? `\n\nThis is batch ${i+1} of ${batches.length}.` : '');
      
      try {
        const batchText = await bedrockService.processImagesWithVision({
          prompt: promptText,
          imageUrls: batch,
          max_tokens: 4000,
          temperature: 0.2,
          system: systemPrompt || `You are an OCR tool. Extract text accurately from ${batch.length > 1 ? 'images' : 'the image'}, preserving formatting and structure.`
        });
        
        // Add batch separator if we have multiple batches
        if (combinedText && batches.length > 1) {
          combinedText += '\n\n--- NEXT PAGE/BATCH ---\n\n';
        }
        
        combinedText += batchText;
        console.log(`Batch ${i+1} processed successfully: ${batchText.length} characters`);
      } catch (error) {
        console.error(`Error processing batch ${i+1}:`, error);
        // Continue with other batches if one fails
        combinedText += `\n\n[Error processing batch ${i+1}: ${error.message}]\n\n`;
      }
    }
    
    console.log(`Successfully extracted text from all images: ${combinedText.length} characters`);
    console.log("Sample extracted text:", combinedText.substring(0, 100) + "...");
    
    return combinedText;
  } catch (error: any) {
    console.error("Error during OCR processing:", error);
    throw error;
  }
}
