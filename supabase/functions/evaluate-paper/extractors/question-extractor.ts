
import { createOpenAIService } from "../services/openai-service.ts";

/**
 * Extracts structured questions from a paper using OpenAI
 */
export async function extractQuestionsFromPaper(fileUrl: string, apiKey: string, extractedText: string): Promise<{ questions: any[] }> {
  try {
    console.log(`Extracting structured questions from paper: ${fileUrl}`);
    const openAIService = createOpenAIService(apiKey);

    const systemPrompt = `You are an expert AI assistant specialized in extracting structured questions from question papers. Your goal is to identify and extract each question, along with its associated details, and format the output as a JSON array.

Instructions:
1.  Carefully analyze the provided text to identify individual questions.
2.  For each question, extract the following information:
    *   questionText: The complete text of the question.
    *   topic: The primary topic or subject area the question belongs to.
    *   difficulty: An estimated difficulty level of the question (Easy, Medium, or Hard).
    *   marks: The marks allocated to the question.
3.  Ensure that the extracted information is accurate and reflects the content of the question paper.
4.  Format the output as a JSON array of question objects.

Output Format:
\`\`\`json
[
    {
        "questionText": "<question text>",
        "topic": "<topic name>",
        "difficulty": "<Easy/Medium/Hard>",
        "marks": <number>
    },
    {
        "questionText": "<question text>",
        "topic": "<topic name>",
        "difficulty": "<Easy/Medium/Hard>",
        "marks": <number>
    },
    ...
]
\`\`\`

Begin!
`;

    const userPrompt = `Please extract the structured questions from the following text:\n\n${extractedText}`;

    const response = await openAIService.createChatCompletion({
      model: "gpt-4-0125-preview",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.data.choices[0].message?.content;

    if (!content) {
      console.warn("No content received from OpenAI for question extraction.");
      return { questions: [] };
    }

    try {
      const questions = JSON.parse(content);
      console.log(`Extracted ${questions.length} structured questions`);
      return { questions: questions };
    } catch (error) {
      console.error("Error parsing question extraction response:", error);
      console.error("Raw response:", content);
      return { questions: [] };
    }
  } catch (error: any) {
    console.error("Error extracting structured questions:", error);
    throw new Error(`Question extraction failed: ${error.message}`);
  }
}

/**
 * Extracts questions from text using a simpler method
 */
export async function extractQuestionsFromText(apiKey: string, text: string): Promise<any[]> {
  try {
    console.log("Extracting questions from text");
    const openAIService = createOpenAIService(apiKey);

    const systemPrompt = `You are an AI assistant specialized in extracting questions from text. Your goal is to identify and extract each question and format the output as a JSON array.

Instructions:
1.  Carefully analyze the provided text to identify individual questions.
2.  Extract the complete text of each question.
3.  Format the output as a JSON array of strings.

Output Format:
\`\`\`json
[
    "<question text>",
    "<question text>",
    ...
]
\`\`\`

Begin!
`;

    const userPrompt = `Please extract the questions from the following text:\n\n${text}`;

    const response = await openAIService.createChatCompletion({
      model: "gpt-4-0125-preview",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const content = response.data.choices[0].message?.content;

    if (!content) {
      console.warn("No content received from OpenAI for question extraction.");
      return [];
    }

    try {
      const questions = JSON.parse(content);
      console.log(`Extracted ${questions.length} questions`);
      return questions;
    } catch (error) {
      console.error("Error parsing question extraction response:", error);
      console.error("Raw response:", content);
      return [];
    }
  } catch (error: any) {
    console.error("Error extracting questions:", error);
    throw new Error(`Question extraction failed: ${error.message}`);
  }
}
