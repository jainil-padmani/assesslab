
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Extract text from ZIP file containing images
 */
export async function extractTextFromZip(zipUrl: string, apiKey: string, systemPrompt: string): Promise<string> {
  console.log("ZIP URL detected, extracting text from image batch...");
      
  try {
    // Fetch the ZIP file
    const zipResponse = await fetch(zipUrl);
    if (!zipResponse.ok) {
      throw new Error(`Failed to fetch ZIP file: ${zipResponse.statusText}`);
    }
    
    const zipData = await zipResponse.arrayBuffer();
    const zip = await JSZip.loadAsync(zipData);
    
    // Extract all PNG files from the ZIP
    const imageFiles: { name: string; dataUrl: string }[] = [];
    const extractionPromises: Promise<void>[] = [];
    
    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir && (relativePath.endsWith('.png') || relativePath.endsWith('.jpg'))) {
        const promise = zipEntry.async('base64').then(base64Data => {
          const imgFormat = relativePath.endsWith('.png') ? 'png' : 'jpeg';
          imageFiles.push({
            name: relativePath,
            dataUrl: `data:image/${imgFormat};base64,${base64Data}`
          });
        });
        extractionPromises.push(promise);
      }
    });
    
    await Promise.all(extractionPromises);
    
    // Sort images by filename to maintain page order
    imageFiles.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`Extracted ${imageFiles.length} images from ZIP`);
    
    if (imageFiles.length === 0) {
      throw new Error("No image files found in ZIP");
    }
    
    // Process images with GPT-4o Vision (up to 20 images max)
    const maxImages = Math.min(imageFiles.length, 20);
    const userContent: any[] = [
      { 
        type: 'text', 
        text: `Extract all the text from these ${maxImages} pages:` 
      }
    ];
    
    for (let i = 0; i < maxImages; i++) {
      userContent.push({
        type: 'image_url',
        image_url: { url: imageFiles[i].dataUrl, detail: "high" }
      });
    }
    
    // Call OpenAI API
    const ocrResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });
    
    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      console.error("OpenAI OCR error:", errorText);
      throw new Error(`OCR extraction failed: ${errorText}`);
    }
    
    const ocrResult = await ocrResponse.json();
    const extractedText = ocrResult.choices[0]?.message?.content;
    
    console.log("OCR extraction successful, extracted text length:", extractedText?.length || 0);
    console.log("Sample extracted text:", extractedText?.substring(0, 100) + "...");
    
    return extractedText;
  } catch (error) {
    console.error("Error processing ZIP:", error);
    throw error;
  }
}

/**
 * Extract text from single image or PDF
 */
export async function extractTextFromFile(fileUrl: string, apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  console.log("Image or PDF detected, using GPT-4o vision for OCR...");
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
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
              { type: 'text', text: userPrompt },
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
      throw new Error(`OCR extraction failed: ${errorText}`);
    }
    
    const ocrResult = await ocrResponse.json();
    const extractedText = ocrResult.choices[0]?.message?.content;
    
    console.log("OCR extraction successful, extracted text length:", extractedText?.length || 0);
    console.log("Sample extracted text:", extractedText?.substring(0, 100) + "...");
    
    return extractedText;
  } catch (error) {
    console.error("Error in OCR extraction:", error);
    throw error;
  }
}

/**
 * Extract text from text file
 */
export async function extractTextFromTextFile(fileUrl: string): Promise<string> {
  const fileResponse = await fetch(fileUrl);
  if (!fileResponse.ok) {
    throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
  }
  
  const fileBlob = await fileResponse.blob();
  return await fileBlob.text();
}

/**
 * Get system prompt based on file type
 */
export function getSystemPrompt(fileType?: string): string {
  if (fileType === 'question_paper') {
    return `You are an OCR expert specialized in extracting text from question papers.
    
    For each question in the document:
    1. Identify the question number clearly.
    2. Extract the complete question text along with any subparts.
    3. Format each question on a new line starting with "Q<number>:" followed by the question.
    4. Preserve the structure of mathematical equations, diagrams descriptions, and any special formatting.
    5. Include all instructions, marks allocations, and other relevant information.
    
    Your response should be structured, accurate, and preserve the original content's organization.`;
  } else if (fileType === 'answer_key') {
    return `You are an OCR expert specialized in extracting text from answer keys.
    
    For each answer in the document:
    1. Identify the question number clearly.
    2. Extract the complete answer text along with any marking guidelines.
    3. Format each answer on a new line starting with "Q<number>:" followed by the answer.
    4. Preserve the structure of mathematical equations, diagrams, and any special formatting.
    5. Include all marking schemes, points allocation, and other evaluation criteria.
    
    Your response should be structured, accurate, and preserve the original content's organization.`;
  } else if (fileType === 'answer_sheet') {
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
  
  return "You are an OCR expert specialized in extracting text from documents.";
}
