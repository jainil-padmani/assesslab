
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageFile {
  name: string;
  dataUrl: string;
}

/**
 * Attempts to download a file with retries
 * @param url The URL to download
 * @param maxRetries Maximum number of retry attempts
 * @returns The downloaded response or throws after max retries
 */
async function downloadWithRetry(url: string, maxRetries = 3): Promise<Response> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Increase timeout for each retry attempt
      const timeout = attempt * 30000; // 30s, 60s, 90s
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      console.log(`Download attempt ${attempt} for ${url} with timeout ${timeout}ms`);
      
      // Try to download with current timeout
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      console.log(`Successfully downloaded from ${url} on attempt ${attempt}`);
      return response;
    } catch (error) {
      lastError = error;
      console.warn(`Download attempt ${attempt} failed for ${url}: ${error.message}`);
      
      if (error.name === 'AbortError') {
        console.warn(`Request timed out on attempt ${attempt}`);
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw new Error(`Failed to download after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`Waiting ${delay}ms before retry ${attempt + 1}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Extracts text from a ZIP file containing images using GPT-4o
 */
export async function extractTextFromZip(
  zipUrl: string, 
  apiKey: string, 
  systemPrompt: string
): Promise<string> {
  try {
    console.log("Processing ZIP URL for enhanced OCR:", zipUrl);
    
    // Fetch the ZIP file with retries and longer timeout
    let zipResponse;
    try {
      zipResponse = await downloadWithRetry(zipUrl);
    } catch (downloadError) {
      console.error("Failed to download ZIP file after retries:", downloadError);
      throw new Error("Failed to download ZIP file: " + downloadError.message);
    }
    
    const zipData = await zipResponse.arrayBuffer();
    console.log("Successfully downloaded ZIP file, size:", zipData.byteLength);
    
    if (zipData.byteLength === 0) {
      throw new Error("Downloaded ZIP file is empty");
    }
    
    // Extract PNG files from ZIP
    let zip;
    try {
      zip = await JSZip.loadAsync(zipData);
    } catch (zipError) {
      console.error("Error loading ZIP file:", zipError);
      throw new Error("Failed to process ZIP file: " + zipError.message);
    }
    
    const imagePromises = [];
    const imageFiles: ImageFile[] = [];
    
    // Process each file in the ZIP
    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir && (relativePath.endsWith('.png') || relativePath.endsWith('.jpg'))) {
        const promise = zipEntry.async('base64').then(base64Data => {
          const imgFormat = relativePath.endsWith('.png') ? 'png' : 'jpeg';
          imageFiles.push({
            name: relativePath,
            dataUrl: `data:image/${imgFormat};base64,${base64Data}`
          });
        });
        imagePromises.push(promise);
      }
    });
    
    await Promise.all(imagePromises);
    
    // Sort images by filename (ensures page order)
    imageFiles.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`Successfully extracted ${imageFiles.length} images from ZIP`);
    
    if (imageFiles.length === 0) {
      throw new Error("No image files found in ZIP");
    }
    
    // Use GPT-4o's vision capabilities for OCR on all pages
    console.log("Performing OCR with GPT-4o on extracted images...");
    
    const messages = [
      { role: 'system', content: systemPrompt }
    ];
    
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
    
    messages.push({ role: 'user', content: userContent });
    
    // Make the OpenAI API call with retries
    let ocrResult;
    try {
      // Increase timeout for OpenAI API call (120 seconds)
      const ocrController = new AbortController();
      const ocrTimeoutId = setTimeout(() => ocrController.abort(), 120000);
      
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
        const errorText = await ocrResponse.text();
        console.error("OpenAI OCR error:", errorText);
        throw new Error("OCR extraction failed: " + errorText);
      }
      
      ocrResult = await ocrResponse.json();
    } catch (apiError) {
      console.error("Error calling OpenAI API:", apiError);
      throw new Error("OpenAI API error: " + apiError.message);
    }
    
    const extractedOcrText = ocrResult.choices[0]?.message?.content;
    
    if (!extractedOcrText) {
      throw new Error("OCR process returned an empty result");
    }
    
    console.log("OCR extraction successful, extracted text length:", extractedOcrText?.length || 0);
    console.log("Sample extracted text:", extractedOcrText?.substring(0, 100) + "...");
    
    return extractedOcrText;
  } catch (error) {
    console.error("Error processing ZIP file:", error);
    throw error;
  }
}

/**
 * Extracts text from a single image or PDF file using GPT-4o
 */
export async function extractTextFromFile(
  fileUrl: string, 
  apiKey: string, 
  systemPrompt: string,
  userPrompt?: string
): Promise<string> {
  try {
    console.log("Processing file for OCR extraction:", fileUrl);
    
    const promptText = userPrompt || "Extract all the text from this document, focusing on identifying question numbers and their corresponding content:";
    
    // Make the OpenAI API call with retries
    let ocrResult;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // Increase timeout for each retry
        const timeout = (retryCount + 1) * 60000; // 60s, 120s, 180s
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        console.log(`OCR API attempt ${retryCount + 1} with timeout ${timeout}ms`);
        
        const ocrResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: systemPrompt },
              { 
                role: 'user', 
                content: [
                  { type: 'text', text: promptText },
                  { 
                    type: 'image_url', 
                    image_url: { 
                      url: fileUrl,
                      detail: "high" 
                    } 
                  }
                ] 
              }
            ],
            temperature: 0.2,
            max_tokens: 4000,
          }),
        });
        
        clearTimeout(timeoutId);

        if (!ocrResponse.ok) {
          const errorText = await ocrResponse.text();
          console.error(`OpenAI OCR error (attempt ${retryCount + 1}):`, errorText);
          
          // Check if we should retry based on error type
          if (errorText.includes("invalid_image_url") || errorText.includes("Timeout while downloading")) {
            retryCount++;
            if (retryCount < maxRetries) {
              // Add exponential backoff
              const delay = Math.min(2000 * Math.pow(2, retryCount), 30000);
              console.log(`Retrying OCR extraction in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            } else {
              throw new Error("OCR extraction failed after multiple attempts: " + errorText);
            }
          } else {
            // For other errors, fail immediately
            throw new Error("OCR extraction failed: " + errorText);
          }
        }
        
        ocrResult = await ocrResponse.json();
        break; // Success, exit the retry loop
      } catch (apiError) {
        if (apiError.name === 'AbortError') {
          console.error(`OCR API timeout on attempt ${retryCount + 1}`);
          retryCount++;
          if (retryCount < maxRetries) {
            // Add exponential backoff
            const delay = Math.min(2000 * Math.pow(2, retryCount), 30000);
            console.log(`Retrying OCR extraction in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            throw new Error("OCR extraction timed out after multiple attempts");
          }
        } else {
          console.error("Error calling OpenAI API:", apiError);
          throw new Error("OpenAI API error: " + apiError.message);
        }
      }
    }
    
    const extractedOcrText = ocrResult?.choices[0]?.message?.content;
    
    if (!extractedOcrText) {
      throw new Error("OCR process returned an empty result");
    }
    
    console.log("OCR extraction successful, extracted text length:", extractedOcrText?.length || 0);
    console.log("Sample extracted text:", extractedOcrText?.substring(0, 100) + "...");
    
    return extractedOcrText;
  } catch (error) {
    console.error("Error during OCR processing:", error);
    throw error;
  }
}
