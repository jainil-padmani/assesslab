
import { createBedrockService } from "../services/bedrock-service.ts";

/**
 * Extracts structured questions from a paper using Claude 3.5 Sonnet
 */
export async function extractQuestionsFromPaper(
  fileUrl: string, 
  credentials: { accessKeyId: string, secretAccessKey: string, region: string }, 
  extractedText: string
): Promise<{ questions: any[] }> {
  try {
    console.log(`Extracting structured questions from paper: ${fileUrl}`);
    const bedrockService = createBedrockService(
      credentials.accessKeyId, 
      credentials.secretAccessKey, 
      credentials.region
    );

    const systemPrompt = `You are an expert AI assistant specialized in extracting structured questions from question papers. Your goal is to identify and extract each question, along with its associated details, and format the output as a JSON array.

Instructions:
1.  Carefully analyze the provided text to identify individual questions.
2.  For each question, extract the following information:
    *   questionText: The complete text of the question.
    *   topic: The primary topic or subject area the question belongs to.
    *   difficulty: An estimated difficulty level of the question (Easy, Medium, or Hard).
    *   marks: The marks allocated to the question.
3.  Ensure that the extracted information is accurate and reflects the content of the question paper.
4.  Format the output as a JSON array of question objects.`;

    const userPrompt = `Please extract the structured questions from the following text:\n\n${extractedText}`;

    const response = await bedrockService.invokeModel({
      messages: [
        { role: "user", content: userPrompt }
      ],
      max_tokens: 4000,
      temperature: 0.2,
      system: systemPrompt
    });

    // Claude 3.5 response structure is different from OpenAI
    const content = response.content[0].text;

    if (!content) {
      console.warn("No content received from Claude for question extraction.");
      return { questions: [] };
    }

    try {
      // Extract the JSON part from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      
      // Sometimes Claude might return multiple JSON arrays or wrap the JSON in markdown
      // Try to clean up the response to get valid JSON
      const cleanedJson = jsonString
        .replace(/^\s*\[\s*\n/, '[') // Remove excess whitespace at start of array
        .replace(/\s*\]\s*$/, ']')   // Remove excess whitespace at end of array
        .replace(/```/g, '')         // Remove any remaining markdown code block markers
        .trim();
      
      const questions = JSON.parse(cleanedJson);
      console.log(`Extracted ${questions.length} structured questions`);
      return { questions: questions };
    } catch (error) {
      console.error("Error parsing question extraction response:", error);
      console.error("Raw response:", content);
      
      // Try a more aggressive approach to extract JSON
      try {
        const possibleJson = content.replace(/.*?(\[[\s\S]*\]).*/s, '$1').trim();
        const questions = JSON.parse(possibleJson);
        console.log(`Extracted ${questions.length} structured questions after cleanup`);
        return { questions: questions };
      } catch (e) {
        console.error("Failed second attempt to parse response:", e);
        return { questions: [] };
      }
    }
  } catch (error: any) {
    console.error("Error extracting structured questions:", error);
    throw new Error(`Question extraction failed: ${error.message}`);
  }
}

/**
 * Extracts questions from text using a simpler method
 */
export async function extractQuestionsFromText(
  credentials: { accessKeyId: string, secretAccessKey: string, region: string },
  text: string
): Promise<any[]> {
  try {
    console.log("Extracting questions from text");
    const bedrockService = createBedrockService(
      credentials.accessKeyId,
      credentials.secretAccessKey,
      credentials.region
    );

    const systemPrompt = `You are an AI assistant specialized in extracting questions from text. Your goal is to identify and extract each question and format the output as a JSON array.

Instructions:
1.  Carefully analyze the provided text to identify individual questions.
2.  Extract the complete text of each question.
3.  Format the output as a JSON array of strings.`;

    const userPrompt = `Please extract the questions from the following text:\n\n${text}`;

    const response = await bedrockService.invokeModel({
      messages: [
        { role: "user", content: userPrompt }
      ],
      max_tokens: 3000,
      temperature: 0.2,
      system: systemPrompt
    });

    // Claude 3.5 response structure is different from OpenAI
    const content = response.content[0].text;

    if (!content) {
      console.warn("No content received from Claude for question extraction.");
      return [];
    }

    try {
      // Extract the JSON part from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      
      const cleanedJson = jsonString
        .replace(/^\s*\[\s*\n/, '[') 
        .replace(/\s*\]\s*$/, ']')   
        .replace(/```/g, '')         
        .trim();
      
      const questions = JSON.parse(cleanedJson);
      console.log(`Extracted ${questions.length} questions`);
      return questions;
    } catch (error) {
      console.error("Error parsing question extraction response:", error);
      console.error("Raw response:", content);
      
      // Try a more aggressive approach to extract JSON
      try {
        const possibleJson = content.replace(/.*?(\[[\s\S]*\]).*/s, '$1').trim();
        const questions = JSON.parse(possibleJson);
        console.log(`Extracted ${questions.length} questions after cleanup`);
        return questions;
      } catch (e) {
        console.error("Failed second attempt to parse response:", e);
        return [];
      }
    }
  } catch (error: any) {
    console.error("Error extracting questions:", error);
    throw new Error(`Question extraction failed: ${error.message}`);
  }
}
