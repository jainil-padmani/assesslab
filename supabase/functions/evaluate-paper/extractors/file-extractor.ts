
import { createBedrockService } from "../services/bedrock-service.ts";
import { urlToBase64, cleanUrlForApi, isPdfUrl } from "../utils/image-processing.ts";
import { createImageBatches, cleanImageUrlsForProcessing } from "../utils/image-batch-processing.ts";
import { extractTextFromImageFile } from "./image-extractor.ts";
import { extractTextFromZip } from "./zip-extractor.ts";
import { getDocumentPagesAsImages } from "../services/document-converter.ts";

/**
 * Extract text from a file using Claude 3.5 Vision
 * Always converts PDFs to images before processing
 */
export async function extractTextFromFile(
  fileUrl: string, 
  credentials: { accessKeyId: string, secretAccessKey: string, region: string }, 
  systemPrompt: string = '', 
  userPrompt?: string
): Promise<string> {
  try {
    if (!fileUrl) {
      throw new Error("No file URL provided");
    }
    
    console.log(`Extracting text from file: ${fileUrl}`);
    
    // Check if this is a ZIP file - if so, redirect to image extraction process
    if (/\.zip/i.test(fileUrl)) {
      console.log("ZIP file detected, redirecting to image extraction function");
      return await extractTextFromZip(
        fileUrl,
        credentials,
        systemPrompt || "You are an OCR tool optimized for extracting text from documents. Extract all visible text content accurately."
      );
    }
    
    // CRITICAL - Check if this is a PDF file - if so, convert to images first
    if (isPdfUrl(fileUrl)) {
      console.log("PDF file detected, converting to images first before OCR");
      try {
        // Get the pre-converted images or throw an error if not available
        const imageUrls = await getDocumentPagesAsImages(fileUrl);
        
        if (imageUrls && imageUrls.length > 0) {
          console.log(`Successfully converted PDF to ${imageUrls.length} images, processing for OCR`);
          return await extractTextFromImageFile(
            JSON.stringify(imageUrls),
            credentials,
            systemPrompt || "You are an OCR tool optimized for extracting text from documents. Extract all visible text content accurately.",
            userPrompt
          );
        } else {
          throw new Error("Failed to convert PDF to images");
        }
      } catch (pdfError) {
        console.error("Error converting PDF to images:", pdfError);
        throw new Error(`PDF conversion error: ${pdfError.message}`);
      }
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
      
      // Check content type to verify it's an image
      const contentType = testResponse.headers.get('content-type') || '';
      console.log(`URL content type: ${contentType}`);
      
      // Reject PDFs directly - they must be converted first
      if (contentType === 'application/pdf' || contentType.includes('pdf')) {
        throw new Error("PDF files must be converted to images before processing with vision models.");
      }
      
      if (!contentType.startsWith('image/') && 
          !contentType.includes('octet-stream')) {
        console.warn(`URL has unexpected content type: ${contentType}. This might cause OCR issues.`);
      }
      
    } catch (urlError) {
      console.error("Error validating document URL:", urlError);
      // Continue despite the error - we'll let the actual processing try anyway
    }
    
    // Ensure region is set to us-east-1 as a fallback
    const region = credentials.region || 'us-east-1';
    
    const bedrockService = createBedrockService(
      credentials.accessKeyId,
      credentials.secretAccessKey,
      region
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
        throw new Error(`OCR extraction failed: The document couldn't be processed. Please verify the document is accessible and is in a supported format (image).`);
      }
      
      throw new Error(`OCR extraction failed: ${apiError.message || "Unknown API error"}`);
    }
  } catch (error: any) {
    console.error("Error extracting text from file:", error);
    throw error;
  }
}

// Re-export functions for backward compatibility
export { extractTextFromImageFile, extractTextFromZip };
