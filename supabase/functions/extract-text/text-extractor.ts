
import JSZip from "https://esm.sh/jszip@3.10.1";

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
    
    // Extract PNG files from ZIP
    const zip = await JSZip.loadAsync(zipData);
    const imagePromises = [];
    const imageFiles: {name: string, dataUrl: string}[] = [];
    
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
    
    // Increase timeout for OpenAI API call
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
    
    const ocrResult = await ocrResponse.json();
    const extractedOcrText = ocrResult.choices[0]?.message?.content;
    
    console.log("OCR extraction successful, extracted text length:", extractedOcrText?.length || 0);
    console.log("Sample extracted text:", extractedOcrText?.substring(0, 100) + "...");
    
    return extractedOcrText;
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
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    const promptText = userPrompt || "Extract all the text from this document, focusing on identifying question numbers and their corresponding content:";
    
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
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch text file: ${response.statusText}`);
    }
    return await response.text();
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
