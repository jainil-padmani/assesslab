
import { Prompts } from './prompts.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocumentInfo {
  url?: string;
  zip_url?: string;
  topic?: string;
  text?: string;
}

/**
 * Evaluate the student's answers using the question paper and answer key
 */
export async function evaluateAnswers(
  apiKey: string,
  testId: string,
  processedQuestionPaper: DocumentInfo,
  processedAnswerKey: DocumentInfo,
  processedStudentAnswer: DocumentInfo,
  studentInfo: any
): Promise<any> {
  try {
    // Prepare the prompts for OpenAI evaluation
    const systemPrompt = Prompts.evaluation(testId);

    const userPrompt = `
You are an AI evaluator responsible for grading a student's answer sheet.
The user will provide you with the question paper(s), answer key(s) / answer criteria, and the student's answer sheet(s).
Analyse the question paper to understand the questions and their marks.
Analyse the answer key to understand the correct answers and valuation criteria.
Assess the answers generously. Award 0 marks for completely incorrect or unattempted answers.

Question Paper for Test ID ${testId}:
${JSON.stringify(processedQuestionPaper)}

Answer Key for Test ID ${testId}:
${JSON.stringify(processedAnswerKey)}

Student Answer Sheet for Test ID ${testId}:
${JSON.stringify(processedStudentAnswer)}

Student Info:
${JSON.stringify(studentInfo)}

Provide the response in a JSON format that contains:

student_name: "${studentInfo?.name || 'Unknown'}"
roll_no: "${studentInfo?.roll_number || 'Unknown'}"
class: "${studentInfo?.class || 'Unknown'}"
subject: "${studentInfo?.subject || 'Unknown'}"
test_id: "${testId || 'Unknown'}"

answers: an array of objects containing the following fields:
- question_no: the question number
- question: the question content
- answer: the student's answer
- score: an array containing [assigned_score, total_score]
- remarks: any remarks or comments regarding the answer
- confidence: a number between 0 and 1 indicating confidence in the grading

Return ONLY the JSON object without any additional text or markdown formatting.
`;

    console.log("Sending request to OpenAI for evaluation");
    
    // Make request to OpenAI with the correct API key format and extended timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    });
    
    clearTimeout(timeoutId);

    if (!openAIResponse.ok) {
      const errorBody = await openAIResponse.text();
      console.error("OpenAI API error:", errorBody);
      throw new Error(`OpenAI API error: ${errorBody}`);
    }

    const aiResponse = await openAIResponse.json();
    console.log("Received response from OpenAI");
    
    if (!aiResponse.choices || !aiResponse.choices[0]?.message?.content) {
      console.error("Invalid response format from OpenAI:", JSON.stringify(aiResponse));
      throw new Error('Invalid response from OpenAI');
    }

    // Parse the evaluation results
    const evaluationText = aiResponse.choices[0].message.content;
    console.log("Evaluation content received:", evaluationText.substring(0, 200) + "...");
    
    try {
      // Validate and clean up the evaluation data
      const evaluation = JSON.parse(evaluationText);
      
      return evaluation;
    } catch (parseError) {
      console.error("Error parsing evaluation results:", parseError, evaluationText);
      throw new Error(`Failed to parse evaluation results: ${parseError.message}`);
    }
  } catch (error) {
    console.error("Error in evaluation function:", error);
    throw error;
  }
}

/**
 * Process the evaluation result to add summary information
 */
export function processEvaluation(
  evaluation: any, 
  testId: string, 
  studentAnswer: DocumentInfo,
  extractedStudentText: string | null,
  extractedQuestionText: string | null,
  extractedAnswerKeyText: string | null
): any {
  try {
    // Calculate total score
    let totalAssignedScore = 0;
    let totalPossibleScore = 0;
    
    if (evaluation.answers && Array.isArray(evaluation.answers)) {
      evaluation.answers.forEach((answer: any) => {
        if (Array.isArray(answer.score) && answer.score.length === 2) {
          totalAssignedScore += Number(answer.score[0]);
          totalPossibleScore += Number(answer.score[1]);
        }
      });
    }
    
    // Add summary information
    evaluation.summary = {
      totalScore: [totalAssignedScore, totalPossibleScore],
      percentage: totalPossibleScore > 0 ? Math.round((totalAssignedScore / totalPossibleScore) * 100) : 0
    };
    
    // Add metadata to ensure proper syncing
    evaluation.test_id = testId;
    evaluation.answer_sheet_url = studentAnswer.url;
    
    // Add the extracted texts if available
    if (extractedStudentText) {
      evaluation.text = extractedStudentText;
      evaluation.isOcrProcessed = true;
      if (studentAnswer?.zip_url) {
        evaluation.zipProcessed = true;
        evaluation.zip_url = studentAnswer.zip_url;
      }
    }
    
    if (extractedQuestionText) {
      evaluation.questionPaperText = extractedQuestionText;
    }
    
    if (extractedAnswerKeyText) {
      evaluation.answerKeyText = extractedAnswerKeyText;
    }
    
    console.log(`Evaluation completed: ${totalAssignedScore}/${totalPossibleScore} (${evaluation.summary.percentage}%)`);
    
    return evaluation;
  } catch (error) {
    console.error("Error processing evaluation:", error);
    throw error;
  }
}
