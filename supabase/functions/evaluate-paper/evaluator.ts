
import { createBedrockService } from "./services/bedrock-service.ts";

// Function to evaluate student answers against question paper and answer key
export async function evaluateAnswers(
  credentials: { accessKeyId: string, secretAccessKey: string, region: string },
  testId: string,
  questionPaper: any,
  answerKey: any,
  studentAnswer: any,
  studentInfo: any
) {
  try {
    console.log("Starting evaluation process for test:", testId);
    
    const bedrockService = createBedrockService(
      credentials.accessKeyId,
      credentials.secretAccessKey,
      credentials.region
    );
    
    // Build the prompt for the evaluation
    const systemPrompt = `You are an AI assistant specialized in evaluating student exam answers. You will be given a question paper, an answer key, and a student's answer sheet. Your task is to evaluate the student's answers, assign marks, and provide detailed feedback.`;
    
    const userPrompt = `
Evaluate this student's answer sheet against the provided question paper and answer key.

STUDENT INFORMATION:
${JSON.stringify(studentInfo, null, 2)}

QUESTION PAPER:
${questionPaper?.text || "No question paper provided"}

ANSWER KEY:
${answerKey?.text || "No answer key provided (use your judgment to evaluate)"}

STUDENT'S ANSWER SHEET:
${studentAnswer?.text || "No student answer provided"}

Analyze the student's answer sheet carefully. For each question:
1. Identify the question number and text from the question paper
2. Extract the student's answer for that question
3. Compare it with the answer key
4. Assign appropriate marks based on correctness
5. Provide specific feedback

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
      "match_method": "direct_numbering" or "semantic_matching"
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
    console.error("Error in evaluateAnswers:", error);
    throw error;
  }
}

// Process the evaluation data and prepare it for storage
export function processEvaluation(
  evaluation: any,
  testId: string,
  studentAnswer: any,
  extractedStudentText: string,
  questionPaperText: string | null,
  answerKeyText: string | null
) {
  // Add metadata to the evaluation
  return {
    ...evaluation,
    metadata: {
      test_id: testId,
      evaluation_timestamp: new Date().toISOString(),
      answer_sheet_url: studentAnswer?.url,
      ocr_processed: true
    },
    question_paper_text: questionPaperText,
    answer_key_text: answerKeyText,
    text: extractedStudentText,
    isOcrProcessed: true
  };
}
