
import { createBedrockService } from "../services/bedrock-service.ts";

/**
 * Matches student answers to questions using semantic similarity
 */
export async function matchAnswersToQuestions(
  credentials: { accessKeyId: string, secretAccessKey: string, region: string },
  questionText: string,
  studentAnswerText: string
): Promise<any> {
  try {
    console.log("Matching student answers to questions using Claude 3.5 Sonnet");
    const bedrockService = createBedrockService(
      credentials.accessKeyId,
      credentials.secretAccessKey,
      credentials.region
    );

    const systemPrompt = `You are an AI assistant specialized in analyzing exam papers. Your task is to match student answers to their corresponding questions based on semantic similarity and contextual understanding.`;

    const userPrompt = `Here is a question paper and a student's answer sheet. The student's answers may not be in the same order as the questions, or they might not have clearly indicated which question they are answering.

QUESTION PAPER:
${questionText}

STUDENT'S ANSWER SHEET:
${studentAnswerText}

Please analyze both documents and match each student answer to the corresponding question. Format your response as a JSON array of matches, with each match containing:
1. The question number and text from the question paper
2. The corresponding answer text from the student's sheet
3. A confidence score (0-1) indicating how certain you are about this match

Output only the JSON response.`;

    const response = await bedrockService.invokeModel({
      messages: [
        { role: "user", content: userPrompt }
      ],
      max_tokens: 4000,
      temperature: 0.2,
      system: systemPrompt
    });

    // Claude 3.5 response structure
    const content = response.content[0].text;

    if (!content) {
      console.warn("No content received from Claude for answer matching.");
      return { matches: [] };
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
      
      const matches = JSON.parse(cleanedJson);
      console.log(`Matched ${matches.length} question-answer pairs`);
      return { matches };
    } catch (error) {
      console.error("Error parsing answer matching response:", error);
      console.error("Raw response:", content);
      
      // Try a more aggressive approach to extract JSON
      try {
        const possibleJson = content.replace(/.*?(\[[\s\S]*\]).*/s, '$1').trim();
        const matches = JSON.parse(possibleJson);
        console.log(`Matched ${matches.length} question-answer pairs after cleanup`);
        return { matches };
      } catch (e) {
        console.error("Failed second attempt to parse response:", e);
        return { matches: [] };
      }
    }
  } catch (error: any) {
    console.error("Error matching answers to questions:", error);
    throw new Error(`Answer matching failed: ${error.message}`);
  }
}
