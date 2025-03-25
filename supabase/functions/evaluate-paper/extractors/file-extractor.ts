
import { createBedrockService } from "../services/bedrock-service.ts";
import { urlToBase64, cleanUrlForApi } from "../utils/image-processing.ts";
import { createImageBatches, cleanImageUrlsForProcessing } from "../utils/image-batch-processing.ts";

/**
 * Extract text from a file using Claude 3.5 Vision
 * With improved error handling for large files
 */
export async function extractTextFromFile(fileUrl: string, credentials: { accessKeyId: string, secretAccessKey: string, region: string }, systemPrompt: string = '', userPrompt?: string): Promise<string> {
  try {
    if (!fileUrl) {
      throw new Error("No file URL provided");
    }
    
    console.log(`Extracting text from file: ${fileUrl}`);
    
    // Check if this is a ZIP file - if so, redirect to image extraction process
    if (/\.zip/i.test(fileUrl)) {
      console.log("ZIP file detected, redirecting to image extraction function");
      
      // We should NOT send zip files directly to Claude
      // Instead use the extractTextFromZip function that handles image extraction
      return await extractTextFromZip(
        fileUrl,
        credentials,
        systemPrompt || "You are an OCR tool optimized for extracting text from documents. Extract all visible text content accurately."
      );
    }
    
    // Process the image URL
    let imageData = cleanUrlForApi(fileUrl);
    console.log("Using direct image URL for processing:", imageData);
    
    // Check if URL actually works before proceeding
    try {
      const testResponse = await fetch(imageData, { 
        method: 'HEAD',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!testResponse.ok) {
        console.error(`URL validation failed for ${imageData}: ${testResponse.status} ${testResponse.statusText}`);
        throw new Error(`Document URL not accessible (HTTP ${testResponse.status}). Please check if the file exists and is publicly accessible.`);
      }
      
      // Check content type to verify it's an image/pdf
      const contentType = testResponse.headers.get('content-type') || '';
      console.log(`URL content type: ${contentType}`);
      
      if (!contentType.startsWith('image/') && 
          contentType !== 'application/pdf' && 
          !contentType.includes('octet-stream')) {
        console.warn(`URL has unexpected content type: ${contentType}. This might cause OCR issues.`);
      }
      
    } catch (urlError) {
      console.error("Error validating document URL:", urlError);
      // Continue despite the error - we'll let the actual processing try anyway
    }
    
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
      
      // If API error contains information about failed images, make it more user-friendly
      if (apiError.message && apiError.message.includes("Failed to process any of the provided images")) {
        throw new Error(`OCR extraction failed: The document couldn't be processed. Please verify the document is accessible and is in a supported format (PDF or image).`);
      }
      
      throw new Error(`OCR extraction failed: ${apiError.message || "Unknown API error"}`);
    }
  } catch (error: any) {
    console.error("Error extracting text from file:", error);
    throw error;
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

/**
 * Extract text from ZIP files containing images
 * This properly extracts images instead of sending the ZIP directly to Claude
 */
export async function extractTextFromZip(zipUrl: string, credentials: any, systemPrompt: string = ''): Promise<string> {
  try {
    console.log("Processing ZIP file for OCR extraction:", zipUrl);
    
    // IMPORTANT: We need to fetch the actual images inside this ZIP file
    // For now, we'll try to get the first image from storage based on the ZIP URL pattern
    
    // Extract the file identifier from the ZIP URL
    // Example URL: .../answer_sheets_zip/answer_sheets_677d129e-c10c-45f9-b460-2894cd3b9c8e_86a3da1b-bc74-40c1-91bf-5234eb32d2f1.zip
    const fileIdMatch = zipUrl.match(/answer_sheets_([^_]+)_([^\.]+)\.zip/);
    
    if (!fileIdMatch) {
      console.error("Could not extract file identifier from ZIP URL:", zipUrl);
      throw new Error("Invalid ZIP file URL format. Cannot extract image references.");
    }
    
    // Look for JPG files in the same storage path but with optimized_pdf_pages prefix
    // This is where individual extracted images should be
    const baseStoragePath = zipUrl.substring(0, zipUrl.lastIndexOf('/'));
    const storageBucket = baseStoragePath.substring(0, baseStoragePath.lastIndexOf('/'));
    
    // Try to find the JPG files by constructing a pattern
    // Based on how our storage structure works for extracted PDF pages
    const optimizedImagesPath = `${storageBucket}/optimized_pdf_pages`;
    
    // Log what we're looking for
    console.log("Looking for optimized images at path:", optimizedImagesPath);
    console.log("With file identifiers:", fileIdMatch[1], fileIdMatch[2]);
    
    // Since we can't list files in the function, we'll try a common pattern for the first page
    const likelyFirstPageUrl = `${optimizedImagesPath}/pdf_page_1_${fileIdMatch[2]}.jpg`;
    console.log("Attempting to use image at:", likelyFirstPageUrl);
    
    // Check if this image exists
    try {
      const imageResponse = await fetch(likelyFirstPageUrl, { method: 'HEAD' });
      if (imageResponse.ok) {
        console.log("Found image file, will use it for extraction");
        // Process this image file instead of the ZIP
        return await extractTextFromImageFile(
          likelyFirstPageUrl,
          credentials,
          systemPrompt
        );
      } else {
        console.log("Image not found at expected path, status:", imageResponse.status);
      }
    } catch (e) {
      console.error("Error checking for image file:", e);
    }
    
    // Fallback: If we can't find the optimized images, we can't process the ZIP directly
    // So we'll need to notify the user
    console.error("Could not find extracted images from ZIP file:", zipUrl);
    throw new Error("ZIP file processing failed: Could not locate extracted images. Please ensure the ZIP contains images or upload individual image files instead.");
  } catch (error) {
    console.error("Error processing ZIP file:", error);
    throw error;
  }
}
