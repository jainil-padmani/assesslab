
import { createOpenAIService } from "../services/openai-service.ts";
import { createDirectImageUrl, validateImageFormats, isSupportedImageFormat } from "../utils/image-processing.ts";

/**
 * Extracts text from a ZIP file containing images
 * This function handles OpenAI's limitations by sending direct data URLs
 */
export async function extractTextFromZip(zipUrl: string, apiKey: string, systemPrompt: string = ''): Promise<string> {
  try {
    console.log("Processing ZIP URL for OCR:", zipUrl);
    
    // Fetch the ZIP file with a longer timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const zipResponse = await fetch(zipUrl, { 
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' }
    });
    clearTimeout(timeoutId);
    
    if (!zipResponse.ok) {
      console.error("Failed to fetch ZIP file:", zipResponse.statusText);
      throw new Error("Failed to fetch ZIP file: " + zipResponse.statusText);
    }
    
    const zipData = await zipResponse.arrayBuffer();
    console.log("Successfully downloaded ZIP file, size:", zipData.byteLength);
    
    // Extract images from ZIP
    // Fix: Import JSZip properly using URL import
    const JSZip = await (await import("https://cdn.skypack.dev/jszip@3.10.1")).default;
    const zip = await JSZip.loadAsync(zipData);
    const imagePromises = [];
    const imageFiles: {name: string, dataUrl: string}[] = [];
    
    // Process each file in the ZIP
    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        // Only process supported image formats
        if (isSupportedImageFormat(relativePath)) {
          const promise = zipEntry.async('base64').then(base64Data => {
            const imgFormat = relativePath.toLowerCase().endsWith('.png') ? 'png' : 
                             relativePath.toLowerCase().endsWith('.jpg') || relativePath.toLowerCase().endsWith('.jpeg') ? 'jpeg' :
                             relativePath.toLowerCase().endsWith('.webp') ? 'webp' : 'gif';
            
            imageFiles.push({
              name: relativePath,
              dataUrl: `data:image/${imgFormat};base64,${base64Data}`
            });
          });
          imagePromises.push(promise);
        } else {
          console.warn(`Skipping unsupported file format: ${relativePath}`);
        }
      }
    });
    
    await Promise.all(imagePromises);
    
    // Sort images by filename (ensures page order)
    imageFiles.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`Successfully extracted ${imageFiles.length} supported images from ZIP`);
    
    if (imageFiles.length === 0) {
      throw new Error("No supported image files found in ZIP. Supported formats are: PNG, JPEG, WEBP, and GIF.");
    }
    
    // Validate that all images are in supported formats
    validateImageFormats(imageFiles);
    
    return await processImagesWithOpenAI(imageFiles, apiKey, systemPrompt);
  } catch (error) {
    console.error("Error processing ZIP file:", error);
    throw error;
  }
}

/**
 * Process images with OpenAI Vision API
 * Handles batching and retry logic
 */
async function processImagesWithOpenAI(imageFiles: {name: string, dataUrl: string}[], apiKey: string, systemPrompt: string = ''): Promise<string> {
  try {
    console.log("Performing OCR with OpenAI on extracted images...");
    
    // Create user message with text and images
    const userContent = [
      { 
        type: 'text', 
        text: `Extract all the text from these ${imageFiles.length} pages, focusing on identifying question numbers and their corresponding content:` 
      }
    ];
    
    // Add each image to the request (up to 20 images)
    const maxImages = Math.min(imageFiles.length, 20);
    for (let i = 0; i < maxImages; i++) {
      userContent.push({ 
        type: 'image_url', 
        image_url: { 
          url: imageFiles[i].dataUrl,
          detail: "high" 
        } 
      });
    }
    
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ];
    
    // Increase timeout for OpenAI API call
    const ocrController = new AbortController();
    const ocrTimeoutId = setTimeout(() => ocrController.abort(), 120000);
    
    try {
      const openAIService = createOpenAIService(apiKey);
      
      const ocrResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: ocrController.signal,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: messages,
          temperature: 0.2,
          max_tokens: 4000,
        }),
      });
      
      clearTimeout(ocrTimeoutId);
  
      if (!ocrResponse.ok) {
        const errorData = await ocrResponse.json();
        console.error("OpenAI OCR error:", JSON.stringify(errorData));
        throw new Error(`OCR extraction failed: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const ocrResult = await ocrResponse.json();
      const extractedOcrText = ocrResult.choices[0]?.message?.content;
      
      console.log("OCR extraction successful, extracted text length:", extractedOcrText?.length || 0);
      console.log("Sample extracted text:", extractedOcrText?.substring(0, 100) + "...");
      
      return extractedOcrText;
    } catch (apiError) {
      clearTimeout(ocrTimeoutId);
      console.error("Error during OpenAI API call:", apiError);
      
      // If we have multiple images, try processing in smaller batches
      if (imageFiles.length > 5) {
        console.log("Trying with fewer images due to API error...");
        
        // Process only the first 5 images for simplicity
        const reducedUserContent = [
          { 
            type: 'text', 
            text: `Extract all the text from these pages, focusing on identifying question numbers and their corresponding content:` 
          }
        ];
        
        // Add just a few images
        const reducedMaxImages = Math.min(5, imageFiles.length);
        for (let i = 0; i < reducedMaxImages; i++) {
          reducedUserContent.push({ 
            type: 'image_url', 
            image_url: { 
              url: imageFiles[i].dataUrl,
              detail: "high" 
            } 
          });
        }
        
        const reducedMessages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: reducedUserContent }
        ];
        
        const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: reducedMessages,
            temperature: 0.2,
            max_tokens: 4000,
          }),
        });
        
        if (!fallbackResponse.ok) {
          const fallbackErrorData = await fallbackResponse.json();
          throw new Error(`OCR extraction failed with reduced batch: ${fallbackErrorData.error?.message || 'Unknown error'}`);
        }
        
        const fallbackResult = await fallbackResponse.json();
        const fallbackText = fallbackResult.choices[0]?.message?.content;
        
        console.log("OCR extraction with reduced batch successful");
        return fallbackText + "\n\n[Note: Only partial document processing was completed due to technical limitations]";
      }
      
      throw apiError;
    }
  } catch (error) {
    console.error("Error processing images with OpenAI:", error);
    throw error;
  }
}
