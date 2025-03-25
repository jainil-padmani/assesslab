
import { createOpenAIService } from "../services/openai-service.ts";

/**
 * Extract text from a file using OpenAI Vision API
 */
export async function extractTextFromFile(fileUrl: string, apiKey: string, systemPrompt: string = ''): Promise<string> {
  try {
    if (!fileUrl) {
      throw new Error("No file URL provided");
    }
    
    console.log(`Extracting text from file: ${fileUrl}`);
    const openAIService = createOpenAIService(apiKey);

    const response = await openAIService.createChatCompletion({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt || "Extract text from the image accurately.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all the text from this document." },
            {
              type: "image_url",
              image_url: {
                url: fileUrl,
                detail: "high"
              },
            },
          ],
        },
      ],
      max_tokens: 4000,
    });

    if (!response?.data?.choices?.[0]?.message?.content) {
      throw new Error("OpenAI API returned an empty response");
    }

    const extractedText = response.data.choices[0].message.content;
    console.log(`Extracted text: ${extractedText.length} characters`);
    return extractedText;
  } catch (error: any) {
    console.error("Error extracting text from file:", error);
    throw new Error(`OCR extraction failed: ${error.message || "Unknown error"}`);
  }
}

/**
 * Extracts text from a single image file
 * Improved version to handle Deno environment
 */
export async function extractTextFromImageFile(
  fileUrl: string, 
  apiKey: string, 
  systemPrompt: string,
  userPrompt?: string
): Promise<string> {
  try {
    if (!fileUrl) {
      throw new Error("No file URL provided");
    }
    
    console.log("Processing file for OCR extraction");
    
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
          { role: 'system', content: systemPrompt || "Extract text accurately, preserving formatting." },
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
    const extractedOcrText = ocrResult?.choices?.[0]?.message?.content;
    
    if (!extractedOcrText) {
      throw new Error("OpenAI API returned an empty response");
    }
    
    console.log("OCR extraction successful, extracted text length:", extractedOcrText.length);
    console.log("Sample extracted text:", extractedOcrText.substring(0, 100) + "...");
    
    return extractedOcrText;
  } catch (error: any) {
    console.error("Error during OCR processing:", error);
    throw error;
  }
}
