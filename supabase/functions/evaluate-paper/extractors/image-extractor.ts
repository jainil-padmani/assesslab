
import { createBedrockService } from "../services/bedrock-service.ts";
import { cleanUrlForApi, isPdfUrl } from "../utils/image-processing.ts";
import { createImageBatches, cleanImageUrlsForProcessing } from "../utils/image-batch-processing.ts";
import { getDocumentPagesAsImages } from "../services/document-converter.ts";

/**
 * Process image files in batches directly with Claude 3.5 Vision
 * Supports batching up to 4 images per request for better efficiency
 * Always converts PDFs to images first
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
    
    // For multi-page documents or batch processing if provided
    // We need to determine if this is a single image or multiple
    let imageUrls: string[] = [];
    
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
        imageUrls = [fileUrl];
      }
    } else {
      // For simple URL
      imageUrls = [fileUrl];
    }
    
    // CRITICAL - Process any PDF URLs and convert them to images first
    let finalImageUrls: string[] = [];
    
    for (const url of imageUrls) {
      if (isPdfUrl(url)) {
        console.log(`Converting PDF to images first: ${url}`);
        try {
          // Get the pre-converted images
          const convertedImages = await getDocumentPagesAsImages(url);
          
          if (convertedImages && convertedImages.length > 0) {
            console.log(`Successfully converted PDF to ${convertedImages.length} images`);
            finalImageUrls.push(...convertedImages);
          } else {
            throw new Error(`Failed to convert PDF to images: ${url}`);
          }
        } catch (pdfError) {
          console.error(`Error converting PDF to images: ${url}`, pdfError);
          throw new Error(`PDF conversion error: ${pdfError.message}`);
        }
      } else {
        // Not a PDF, add directly
        finalImageUrls.push(cleanUrlForApi(url));
      }
    }
    
    if (finalImageUrls.length === 0) {
      throw new Error("No valid images to process after PDF conversion");
    }
    
    console.log(`Final list of ${finalImageUrls.length} images for processing`);
    
    // Create batches of images (Claude 3.5 supports up to 4 images per request)
    const batches = createImageBatches(finalImageUrls);
    console.log(`Created ${batches.length} batch(es) of images`);
    
    // Process each batch and combine results
    let combinedText = '';
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i+1}/${batches.length} with ${batch.length} image(s)`);
      console.log(`Batch ${i+1} images:`, batch);
      
      const promptText = userPrompt || 
        `Extract all the text from ${batch.length > 1 ? 'these images' : 'this image'}, preserving structure and formatting:` +
        (batches.length > 1 ? `\n\nThis is batch ${i+1} of ${batches.length}.` : '');
      
      try {
        // New implementation: Use the improved vision service
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
        combinedText += `\n\n[Error processing batch ${i+1}: ${error instanceof Error ? error.message : 'Unknown error'}]\n\n`;
      }
    }
    
    if (!combinedText.trim()) {
      throw new Error("Failed to extract any text from the provided images. Please check the document format and accessibility.");
    }
    
    console.log(`Successfully extracted text from all images: ${combinedText.length} characters`);
    console.log("Sample extracted text:", combinedText.substring(0, 100) + "...");
    
    return combinedText;
  } catch (error: any) {
    console.error("Error during OCR processing:", error);
    throw error;
  }
}
