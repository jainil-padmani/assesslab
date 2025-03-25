
import JSZip from "https://esm.sh/jszip@3.10.1";

/**
 * Checks if a file has a supported image format for OpenAI vision API
 */
function isSupportedImageFormat(filename: string): boolean {
  const supportedFormats = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
  const lowerFilename = filename.toLowerCase();
  return supportedFormats.some(format => lowerFilename.endsWith(format));
}

/**
 * Validates that a URL is accessible and returns a valid image
 * Returns the final URL after any redirects
 */
async function validateImageUrl(imageUrl: string): Promise<string> {
  try {
    console.log(`Validating image URL: ${imageUrl}`);
    
    // Remove any cache parameters or query strings
    const cleanUrl = imageUrl.split('?')[0];
    
    // Set a timeout for the validation request (5 seconds)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    // Send a HEAD request to check if the URL is accessible
    const response = await fetch(cleanUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`Image URL returned status ${response.status}`);
    }
    
    // Return the URL in case it was redirected
    return cleanUrl;
  } catch (error) {
    console.error(`Image URL validation failed: ${error.message}`);
    throw new Error(`Failed to validate image URL: ${error.message}`);
  }
}

/**
 * Downloads an image with proper error handling and timeouts
 */
async function downloadImageWithRetry(imageUrl: string, maxRetries = 2): Promise<Blob> {
  let retries = 0;
  let lastError: Error | null = null;
  
  while (retries <= maxRetries) {
    try {
      console.log(`Downloading image (attempt ${retries + 1}/${maxRetries + 1}): ${imageUrl}`);
      
      // Create a controller for the fetch timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
      
      const response = await fetch(imageUrl, { 
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Image download failed with status: ${response.status}`);
      }
      
      // Get the image blob
      const imageBlob = await response.blob();
      
      // Verify the content type is an image
      const contentType = imageBlob.type;
      if (!contentType.startsWith('image/')) {
        throw new Error(`Downloaded content is not an image: ${contentType}`);
      }
      
      // Verify the blob size
      if (imageBlob.size === 0) {
        throw new Error('Downloaded image has zero size');
      }
      
      console.log(`Successfully downloaded image (${imageBlob.size} bytes, type: ${contentType})`);
      return imageBlob;
    } catch (error) {
      lastError = error as Error;
      console.error(`Download attempt ${retries + 1} failed: ${error.message}`);
      retries++;
      
      // Only wait before retrying if we're going to retry
      if (retries <= maxRetries) {
        // Exponential backoff - wait longer with each retry
        const waitTime = Math.pow(2, retries) * 1000;
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw new Error(`Failed to download image after ${maxRetries + 1} attempts: ${lastError?.message}`);
}

/**
 * Converts image to PNG format if needed (placeholder for future implementation)
 * Currently just validates the format
 */
function ensureSupportedFormat(dataUrl: string, filename: string): string {
  if (!isSupportedImageFormat(filename)) {
    console.warn(`Unsupported image format detected: ${filename}. This may cause OCR issues.`);
  }
  return dataUrl;
}

/**
 * Validate the format of images in the ZIP
 * Logs warnings for any unsupported formats
 */
function validateZipContents(files: {name: string, dataUrl: string}[]): boolean {
  let allValid = true;
  
  for (const file of files) {
    if (!isSupportedImageFormat(file.name)) {
      console.warn(`Found unsupported image format in ZIP: ${file.name}`);
      allValid = false;
    }
  }
  
  return allValid;
}

/**
 * Pre-validates a ZIP file before full processing
 */
async function preValidateZipUrl(zipUrl: string): Promise<boolean> {
  try {
    console.log(`Pre-validating ZIP URL: ${zipUrl}`);
    
    // Set a timeout for the validation request (8 seconds)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    // Send a HEAD request to check if the URL is accessible
    const response = await fetch(zipUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.error(`ZIP URL returned status ${response.status}`);
      return false;
    }
    
    // Check content type
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('zip') && !contentType.includes('octet-stream')) {
      console.warn(`ZIP URL content type unexpected: ${contentType}`);
      // Continue anyway, as Supabase might not set the correct content type
    }
    
    return true;
  } catch (error) {
    console.error(`ZIP URL pre-validation failed: ${error.message}`);
    return false;
  }
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
    
    // Pre-validate the ZIP URL before attempting download
    const isValid = await preValidateZipUrl(zipUrl);
    if (!isValid) {
      console.warn("ZIP URL pre-validation failed, will attempt download anyway");
    }
    
    // Fetch the ZIP file with a longer timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const zipResponse = await fetch(zipUrl, { 
      signal: controller.signal,
      headers: { 
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    clearTimeout(timeoutId);
    
    if (!zipResponse.ok) {
      console.error("Failed to fetch ZIP file:", zipResponse.statusText);
      throw new Error("Failed to fetch ZIP file: " + zipResponse.statusText);
    }
    
    const zipData = await zipResponse.arrayBuffer();
    console.log("Successfully downloaded ZIP file, size:", zipData.byteLength);
    
    // Extract PNG files from ZIP
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
    const allValid = validateZipContents(imageFiles);
    if (!allValid) {
      console.warn("Some images in the ZIP file have unsupported formats. This may cause OCR issues.");
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
      try {
        // Ensure the image format is supported and properly formatted
        const processedImageUrl = ensureSupportedFormat(imageFiles[i].dataUrl, imageFiles[i].name);
        
        userContent.push({ 
          type: 'image_url', 
          image_url: { 
            url: processedImageUrl,
            detail: "high" 
          } 
        });
      } catch (imageError) {
        console.error(`Error processing image ${imageFiles[i].name}:`, imageError);
        // Continue with other images
      }
    }
    
    messages.push({ role: 'user', content: userContent });
    
    // Increase timeout for OpenAI API call
    const ocrController = new AbortController();
    const ocrTimeoutId = setTimeout(() => ocrController.abort(), 120000);
    
    try {
      console.log("Sending request to OpenAI with images from ZIP...");
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
          try {
            reducedUserContent.push({ 
              type: 'image_url', 
              image_url: { 
                url: ensureSupportedFormat(imageFiles[i].dataUrl, imageFiles[i].name),
                detail: "high" 
              } 
            });
          } catch (err) {
            console.warn(`Skipping problematic image ${i}`);
          }
        }
        
        const reducedMessages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: reducedUserContent }
        ];
        
        console.log("Trying fallback with reduced image batch...");
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
    console.error("Error processing ZIP file:", error);
    throw error;
  }
}

/**
 * Extracts text from a file using GPT-4o's vision capabilities
 */
export async function extractTextFromFile(
  fileUrl: string, 
  apiKey: string, 
  systemPrompt: string,
  userPrompt?: string
): Promise<string> {
  try {
    console.log("Processing file for OCR extraction:", fileUrl);
    
    // Validate the image URL and get the final URL after any redirects
    try {
      fileUrl = await validateImageUrl(fileUrl);
    } catch (validationError) {
      console.warn("Image URL validation failed, will attempt direct download:", validationError.message);
    }
    
    // Attempt to download the image with retries
    try {
      console.log("Downloading image directly before OCR processing");
      await downloadImageWithRetry(fileUrl);
      console.log("Image download verification successful");
    } catch (downloadError) {
      console.warn("Direct image download test failed:", downloadError.message);
      console.log("Proceeding with OCR using the URL directly...");
    }
    
    // Use a controller with timeout for the OCR request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    const promptText = userPrompt || "Extract all the text from this document, focusing on identifying question numbers and their corresponding content:";
    
    console.log("Sending OCR request to OpenAI API...");
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
      console.error("OpenAI OCR error:", errorText);
      throw new Error("OCR extraction failed: " + errorText);
    }
    
    const ocrResult = await ocrResponse.json();
    const extractedOcrText = ocrResult.choices[0]?.message?.content;
    
    console.log("OCR extraction successful, extracted text length:", extractedOcrText?.length || 0);
    console.log("Sample extracted text:", extractedOcrText?.substring(0, 100) + "...");
    
    return extractedOcrText;
  } catch (error) {
    console.error("Error during OCR processing:", error);
    throw error;
  }
}

/**
 * Extracts content from a text file by fetching it
 */
export async function extractTextFromTextFile(fileUrl: string): Promise<string> {
  try {
    console.log(`Fetching text file: ${fileUrl}`);
    
    // Remove any cache parameters
    const cleanUrl = fileUrl.split('?')[0];
    
    // Set a timeout for the fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(cleanUrl, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch text file: ${response.statusText}`);
    }
    
    const text = await response.text();
    console.log(`Successfully fetched text file (${text.length} characters)`);
    
    return text;
  } catch (error) {
    console.error("Error reading text file:", error);
    throw error;
  }
}

/**
 * Returns the appropriate system prompt based on file type
 */
export function getSystemPrompt(fileType?: string): string {
  if (fileType === 'questionPaper') {
    return `You are an OCR expert specialized in extracting text from question papers.
    
    For each question in the document:
    1. Identify the question number clearly.
    2. Extract the complete question text along with any subparts.
    3. Format each question on a new line starting with "Q<number>:" followed by the question.
    4. Preserve the structure of mathematical equations, diagrams descriptions, and any special formatting.
    5. Include all instructions, marks allocations, and other relevant information.
    
    Your response should be structured, accurate, and preserve the original content's organization.`;
  } 
  else if (fileType === 'answerKey') {
    return `You are an OCR expert specialized in extracting text from answer keys.
    
    For each answer in the document:
    1. Identify the question number clearly.
    2. Extract the complete answer text along with any marking guidelines.
    3. Format each answer on a new line starting with "Q<number>:" followed by the answer.
    4. Preserve the structure of mathematical equations, diagrams, and any special formatting.
    5. Include all marking schemes, points allocation, and other evaluation criteria.
    
    Your response should be structured, accurate, and preserve the original content's organization.`;
  }
  
  // Default for answer sheets and other documents
  return `You are an OCR expert specialized in extracting text from handwritten answer sheets and documents.
  
  For each question in the document:
  1. Identify the question number clearly.
  2. Extract the complete answer text.
  3. Format each answer on a new line starting with "Q<number>:" followed by the answer.
  4. If the handwriting is difficult to read, make your best effort and indicate uncertainty with [?].
  5. Maintain the structure of mathematical equations, diagrams descriptions, and any special formatting.
  6. If you identify multiple pages, process each and maintain continuity between questions.
  
  Your response should be structured, accurate, and preserve the original content's organization.`;
}
