
/**
 * Extractor for direct processing of image files
 */
import { createBedrockService } from "../services/bedrock-service.ts";
import { validateUrlAccessibility, getUrlContentType, prepareUrlForProcessing } from "../utils/url-validator.ts";

/**
 * Extract text from a direct image file using Claude Vision
 */
export async function extractTextFromDirectFile(
  fileUrl: string,
  credentials: { accessKeyId: string, secretAccessKey: string, region: string },
  systemPrompt: string = '',
  userPrompt?: string
): Promise<string> {
  try {
    // Clean and prepare the URL
    const imageData = prepareUrlForProcessing(fileUrl);
    console.log("Using direct image URL for processing:", imageData);
    
    // Validate the URL before processing
    const isUrlValid = await validateUrlAccessibility(imageData);
    if (!isUrlValid) {
      console.error(`URL validation failed for ${imageData}`);
      throw new Error(`Document URL not accessible. Please check if the file exists and is publicly accessible.`);
    }
    
    // Check content type for validation
    const contentType = await getUrlContentType(imageData);
    console.log(`URL content type: ${contentType}`);
    
    // Reject PDFs directly - they must be converted first
    if (contentType === 'application/pdf' || (contentType && contentType.includes('pdf'))) {
      throw new Error("PDF files must be converted to images before processing with vision models.");
    }
    
    if (contentType && !contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
      console.warn(`URL has unexpected content type: ${contentType}. This might cause OCR issues.`);
    }
    
    // Ensure region is set to us-east-1 as a fallback
    const region = credentials.region || 'us-east-1';
    
    // Create Bedrock service
    const bedrockService = createBedrockService(
      credentials.accessKeyId,
      credentials.secretAccessKey,
      region
    );
    
    // Prepare prompt for extraction
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
    console.error("Error extracting text from direct file:", error);
    throw error;
  }
}
