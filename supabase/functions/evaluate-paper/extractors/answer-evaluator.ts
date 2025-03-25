
/**
 * Evaluates student answers using extracted questions from the question paper
 * This function leverages structured question extraction for better evaluation
 */
export async function evaluateWithExtractedQuestions(
  apiKey: string,
  extractedQuestions: any[],
  answerKeyText: string,
  studentAnswerText: string,
  studentInfo: any
): Promise<any> {
  try {
    console.log("Starting evaluation with extracted questions");
    
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
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',  // Using the updated model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      // Parse and validate the response
      const evaluation = JSON.parse(content);
      
      // Validate the structure of the response
      if (!evaluation.answers || !Array.isArray(evaluation.answers) || !evaluation.summary) {
        throw new Error("Invalid evaluation structure");
      }
      
      return evaluation;
    } catch (error) {
      console.error("Error parsing evaluation response:", error);
      throw new Error("Failed to parse evaluation response");
    }
  } catch (error) {
    console.error("Error in evaluateWithExtractedQuestions:", error);
    throw error;
  }
}
