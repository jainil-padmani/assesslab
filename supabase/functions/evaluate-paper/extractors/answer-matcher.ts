
import { createOpenAIService } from "../services/openai-service.ts";

/**
 * Matches student answers to questions using semantic similarity
 */
export async function matchAnswersToQuestions(apiKey: string, questionPaperText: string, studentAnswerText: string): Promise<{ matches: any[] }> {
  try {
    console.log("Matching student answers to questions using semantic similarity");
    const openAIService = createOpenAIService(apiKey);

    const systemPrompt = `You are an AI assistant specialized in matching student answers to questions based on semantic similarity. Your goal is to identify which questions each answer is most likely addressing.

Instructions:
1.  Analyze the provided question paper text to understand the context of each question.
2.  Analyze the student's answer text to identify individual answers.
3.  Determine the semantic similarity between each answer and each question.
4.  Identify the most likely question for each answer.
5.  Format the output as a JSON array of match objects.

Output Format:
\`\`\`json
[
    {
        "question": "<question text>",
        "answer": "<answer text>",
        "similarityScore": <number between 0 and 1>
    },
    ...
]
\`\`\`

Begin!
`;

    const userPrompt = `Question Paper Text:\n${questionPaperText}\n\nStudent Answer Text:\n${studentAnswerText}`;

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
      console.warn("No content received from OpenAI for answer matching.");
      return { matches: [] };
    }

    try {
      const matches = JSON.parse(content);
      console.log(`Found ${matches.length} potential question-answer matches`);
      return { matches: matches };
    } catch (error) {
      console.error("Error parsing answer matching response:", error);
      console.error("Raw response:", content);
      return { matches: [] };
    }
  } catch (error: any) {
    console.error("Error matching answers to questions:", error);
    throw new Error(`Answer matching failed: ${error.message}`);
  }
}
