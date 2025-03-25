
import { createBedrockService } from "../services/bedrock-service.ts";

/**
 * Evaluates student answers using extracted questions from the question paper
 * This function leverages structured question extraction for better evaluation
 */
export async function evaluateWithExtractedQuestions(
  credentials: { accessKeyId: string, secretAccessKey: string, region: string },
  extractedQuestions: any[],
  answerKeyText: string,
  studentAnswerText: string,
  studentInfo: any
): Promise<any> {
  try {
    console.log("Starting evaluation with extracted questions using Claude 3.5 Sonnet");
    
    const bedrockService = createBedrockService(
      credentials.accessKeyId,
      credentials.secretAccessKey,
      credentials.region
    );
    
    // Build the prompt for the evaluation
    const systemPrompt = `You are an AI assistant specialized in evaluating student exam answers. You will be given extracted questions from a question paper, an answer key, and a student's answer sheet. Your task is to evaluate the student's answers, assign marks, and provide detailed feedback.`;
    
    // Format the extracted questions into a readable format
    const formattedQuestions = extractedQuestions.map((q, i) => 
      `Question ${i+1}: ${typeof q === 'string' ? q : (q.questionText || q.question_text || q)}`
    ).join('\n\n');
    
    const userPrompt = `
Evaluate this student's answer sheet using the provided extracted questions and answer key.

STUDENT INFORMATION:
${JSON.stringify(studentInfo, null, 2)}

EXTRACTED QUESTIONS:
${formattedQuestions}

ANSWER KEY:
${answerKeyText || "No answer key provided (use your judgment to evaluate)"}

STUDENT'S ANSWER SHEET:
${studentAnswerText || "No student answer provided"}

Analyze the student's answer sheet carefully. For each question:
1. Match the student's answer to the corresponding question
2. Compare it with the expected answer from the answer key
3. Assign appropriate marks based on correctness
4. Provide specific feedback

Format your evaluation as a JSON object with this structure:
{
  "student_name": "${studentInfo?.name || 'Unknown'}",
  "roll_no": "${studentInfo?.roll_number || 'Unknown'}",
  "class": "${studentInfo?.class || 'Unknown'}",
  "subject": "${studentInfo?.subject || 'Unknown'}",
  "answers": [
    {
      "question_no": "1",
      "question": "The question text from paper",
      "answer": "Student's answer for this question",
      "expected_answer": "The expected answer from the answer key",
      "score": [5, 10],  // [assigned score, maximum score]
      "remarks": "Detailed feedback on the answer",
      "confidence": 0.9,  // your confidence in the evaluation
      "match_method": "extracted_question"
    },
    // Repeat for all questions
  ],
  "summary": {
    "totalScore": [25, 50],  // [total assigned, total possible]
    "percentage": 50
  }
}

Output only the JSON with no additional text.`;

    const response = await bedrockService.invokeModel({
      messages: [
        { role: "user", content: userPrompt }
      ],
      max_tokens: 4000,
      temperature: 0.3,
      system: systemPrompt
    });

    // Claude 3.5 response structure
    const content = response.content[0].text;
    
    try {
      // Extract the JSON part from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      
      const cleanedJson = jsonString
        .replace(/```/g, '')
        .trim();
      
      // Parse and validate the response
      const evaluation = JSON.parse(cleanedJson);
      
      // Validate the structure of the response
      if (!evaluation.answers || !Array.isArray(evaluation.answers) || !evaluation.summary) {
        throw new Error("Invalid evaluation structure");
      }
      
      return evaluation;
    } catch (error) {
      console.error("Error parsing evaluation response:", error);
      
      // Try a more aggressive approach to extract JSON
      try {
        // Remove any text before { and after the last }
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const evaluation = JSON.parse(jsonMatch[0]);
          if (evaluation.answers && Array.isArray(evaluation.answers) && evaluation.summary) {
            return evaluation;
          }
        }
        throw new Error("Failed to parse evaluation response");
      } catch (e) {
        console.error("Failed second attempt to parse response:", e);
        throw new Error("Failed to parse evaluation response");
      }
    }
  } catch (error) {
    console.error("Error in evaluateWithExtractedQuestions:", error);
    throw error;
  }
}
