import { extractTextWithOpenAI } from "./openai.ts";

// Extract text from a file URL (any type) using OpenAI
export async function extractTextFromFile(
  fileUrl: string,
  apiKey: string,
  systemPrompt: string
): Promise<string> {
  console.log(`Extracting text from file URL: ${fileUrl}`);
  
  try {
    // Determine file extension from URL
    const urlWithoutParams = fileUrl.split('?')[0];
    const fileExtension = urlWithoutParams.split('.').pop()?.toLowerCase() || '';
    
    // List of supported image formats for OpenAI Vision
    const supportedImageFormats = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    
    // Check if file is a PDF or image
    const isPdf = fileExtension === 'pdf';
    const isValidImageFormat = supportedImageFormats.includes(fileExtension || '');
    
    // Validate file format - UploadThing handles PDFs, but check for our OCR process
    if (!isPdf && !isValidImageFormat) {
      throw new Error(`The image format is not supported. Please upload PNG, JPEG, GIF, or WEBP files.`);
    }
    
    // Call the OpenAI API for vision OCR
    console.log("Extracting text with OpenAI Vision...");
    const extractedText = await extractTextWithOpenAI(fileUrl, apiKey, systemPrompt);
    
    console.log(`Successfully extracted ${extractedText.length} characters`);
    return extractedText;
  } catch (error) {
    console.error("OCR extraction failed:", error);
    throw new Error(`OCR extraction failed: ${error.message}`);
  }
}

// Function to extract questions from a paper
export async function extractQuestionsFromPaper(
  paperUrl: string,
  apiKey: string,
  paperText: string
): Promise<{ questions: any[] }> {
  try {
    console.log("Extracting questions from paper text");
    
    // System prompt for question extraction
    const systemPrompt = `You are an assistant specialized in extracting questions from academic test papers.
    Analyze the text content and identify all questions. 
    For each question, extract:
    1. Question number
    2. Question text
    3. Marks allocated (if specified)
    Format the results as a structured array of question objects.`;
    
    // Construct the prompt
    const prompt = `Extract questions from this paper:\n\n${paperText}\n\nFormat as JSON array with objects containing: questionNumber, questionText, and marks properties.`;
    
    // Use OpenAI to extract structured questions
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const contentString = data.choices[0]?.message?.content || "{}";
    
    // Parse the response JSON
    try {
      const parsedContent = JSON.parse(contentString);
      const questions = parsedContent.questions || [];
      console.log(`Extracted ${questions.length} questions from paper`);
      return { questions };
    } catch (parseError) {
      console.error("Error parsing questions JSON:", parseError);
      return { questions: [] };
    }
  } catch (error) {
    console.error("Error extracting questions:", error);
    return { questions: [] };
  }
}

// The following functions remain but are simplified as we'll rely on UploadThing's handling
export async function extractTextFromZip(
  zipUrl: string, 
  apiKey: string,
  systemPrompt: string
): Promise<string> {
  // With UploadThing, we don't need to handle ZIP files anymore
  // Just process the URL directly
  return await extractTextFromFile(zipUrl, apiKey, systemPrompt);
}
