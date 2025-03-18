
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, content, bloomsTaxonomy, difficulty, courseOutcomes, questionTypes, questionMode } = await req.json();
    
    if (!topic || !content) {
      return new Response(
        JSON.stringify({ error: "Topic and content are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Make course outcomes optional
    const validCourseOutcomes = courseOutcomes || [];
    
    console.log(`Generating questions for ${topic} with difficulty ${difficulty}% in ${questionMode || 'standard'} mode`);
    console.log("Course outcomes:", validCourseOutcomes);
    console.log("Question types:", questionTypes);
    
    // Calculate total questions from question types
    let totalQuestions = 0;
    let questionTypesConfig = {};
    
    if (questionTypes && Object.keys(questionTypes).length > 0) {
      // Use the question types configuration provided
      questionTypesConfig = questionTypes;
      totalQuestions = Object.values(questionTypes).reduce((sum: number, count: any) => sum + (count as number), 0);
    } else {
      // Default question types configuration
      if (questionMode === "multiple-choice") {
        questionTypesConfig = {
          "Multiple Choice (1 mark)": 10
        };
        totalQuestions = 10;
      } else {
        questionTypesConfig = {
          "Short Answer (1 mark)": 5,
          "Short Answer (2 marks)": 3,
          "Medium Answer (4 marks)": 2,
          "Long Answer (8 marks)": 1
        };
        totalQuestions = 11; // Default total from above
      }
    }
    
    // If no questions would be generated, set a minimum
    if (totalQuestions === 0) {
      totalQuestions = 10;
    }
    
    // Get the OpenAI API key
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key is not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Generate actual questions using OpenAI API
    let promptContent = `
Generate ${totalQuestions} exam questions with answers for the topic: ${topic}.

Course Content:
${content.substring(0, 4000)}

Requirements:
- Questions should be appropriate for a college-level exam
- Create questions according to the following distribution:
${Object.entries(questionTypesConfig).map(([type, count]) => `  - ${type}: ${count} questions`).join('\n')}
- Questions should be aligned with the specified course outcomes and Bloom's taxonomy levels
- Difficulty level should be approximately ${difficulty}% on a scale of 0-100
`;

    // Add specific requirements based on question mode
    if (questionMode === "multiple-choice") {
      promptContent += `
- ALL questions should be multiple choice with EXACTLY 4 options for each question
- For each multiple choice question, provide 4 options and clearly indicate the correct answer
- Make sure options are distinct and cover potential misconceptions or partial understandings
`;
    } else {
      promptContent += `
- All questions should be theory questions that require written answers
- For all question types, provide a detailed model answer that would receive full marks
- Shorter answer questions (1-2 marks) should focus on definitions, brief explanations, or simple applications
- Medium answer questions (4 marks) should involve more extensive explanations, analyses, or applications
- Long answer questions (8 marks) should require comprehensive explanations, critical analysis, or extended problem-solving
`;
    }

    // Add course outcomes section if available
    if (validCourseOutcomes.length > 0) {
      promptContent += `
Course Outcomes:
${validCourseOutcomes.filter(co => co.selected).map(co => `CO${co.co_number}: ${co.description}`).join('\n')}

Question Distribution:
${validCourseOutcomes.filter(co => co.selected).map(co => `- CO${co.co_number}: ${co.questionCount} questions`).join('\n')}`;
    } else {
      promptContent += '\nNo specific course outcomes provided.';
    }

    // Add Blooms taxonomy section
    promptContent += `
Bloom's Taxonomy distribution:
${Object.entries(bloomsTaxonomy).map(([level, value]) => `- ${level}: ${value}%`).join('\n')}

Format each question as:
{
  "text": "The question text here",
  "type": "question type (Multiple Choice, Short Answer, etc.)",
  "level": "bloom's taxonomy level (remember, understand, apply, analyze, evaluate, create)",
  "courseOutcome": CO number (integer, if applicable),
  "marks": marks value based on question type,
  "answer": "Detailed model answer that would receive full marks",
  ${questionMode === "multiple-choice" ? `"options": [{"text": "Option A", "isCorrect": false}, {"text": "Option B", "isCorrect": true}, ...] (MUST include 4 options with exactly 1 correct answer)` : ""}
}

Make sure ALL questions have appropriate answers. ${questionMode === "multiple-choice" ? "For multiple choice questions, clearly indicate the correct option in the options array and include EXACTLY 4 options for each question." : "For theory questions, provide detailed model answers appropriate to the mark value of the question."}
`;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              "role": "system",
              "content": `You are an expert in generating educational assessment questions. Provide detailed, appropriate questions with model answers that align with course outcomes and Bloom's taxonomy levels. ${questionMode === "multiple-choice" ? "For multiple choice questions, always provide exactly 4 options with exactly 1 correct answer." : "For theory questions, provide detailed model answers appropriate to the mark value of each question."}`
            },
            {
              "role": "user",
              "content": promptContent
            }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });
    
      if (!response.ok) {
        const errorData = await response.json();
        console.error("OpenAI API error:", errorData);
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }
    
      const aiResponse = await response.json();
      console.log("OpenAI response received");
      const aiContent = aiResponse.choices[0].message.content;
      
      // Extract JSON objects from the response
      const jsonMatches = aiContent.match(/\{[\s\S]*?\}/g) || [];
      let generatedQuestions = [];
      
      try {
        for (const jsonStr of jsonMatches) {
          try {
            const question = JSON.parse(jsonStr);
            
            // Assign a unique ID to each question
            generatedQuestions.push({
              id: `q${generatedQuestions.length + 1}`,
              text: question.text,
              type: question.type,
              marks: question.marks || getMarksForQuestionType(question.type),
              level: question.level,
              courseOutcome: question.courseOutcome,
              answer: question.answer || "",
              options: question.options || null,
              selected: false
            });
          } catch (parseError) {
            console.error("Error parsing question JSON:", parseError, jsonStr);
          }
        }
      } catch (parseError) {
        console.error("Error extracting questions:", parseError);
      }
      
      // If we couldn't extract questions from the JSON format, fallback to generating them
      if (generatedQuestions.length === 0) {
        generatedQuestions = generateFallbackQuestions(totalQuestions, validCourseOutcomes, bloomsTaxonomy, difficulty, topic, questionTypesConfig, questionMode);
      }
      
      console.log(`Generated ${generatedQuestions.length} questions`);
    
      return new Response(
        JSON.stringify({ questions: generatedQuestions }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (apiError) {
      console.error("Error calling OpenAI API:", apiError);
      
      // Fallback to local question generation
      const generatedQuestions = generateFallbackQuestions(totalQuestions, validCourseOutcomes, bloomsTaxonomy, difficulty, topic, questionTypesConfig, questionMode);
      
      return new Response(
        JSON.stringify({ 
          questions: generatedQuestions,
          warning: "Used fallback question generation due to API error."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error generating questions:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

function generateFallbackQuestions(totalQuestions, courseOutcomes, bloomsTaxonomy, difficulty, topic, questionTypesConfig, questionMode = "multiple-choice") {
  const generatedQuestions = [];
  let questionId = 1;
  
  // Convert questionTypesConfig to an array for easier distribution
  const questionTypesList = [];
  Object.entries(questionTypesConfig).forEach(([type, count]) => {
    for (let i = 0; i < (count as number); i++) {
      questionTypesList.push(type);
    }
  });
  
  // If we have course outcomes, generate questions for each
  if (courseOutcomes && courseOutcomes.length > 0) {
    // Generate questions for each course outcome
    for (const co of courseOutcomes) {
      if (!co.selected) continue;
      
      for (let i = 0; i < (co.questionCount || 1); i++) {
        // Determine Bloom's taxonomy level based on distribution
        let bloomsLevel = getRandomBloomsLevel(bloomsTaxonomy);
        
        // Get question type for this iteration
        const typeIndex = Math.min(questionTypesList.length - 1, generatedQuestions.length);
        const questionType = questionTypesList[typeIndex] || (questionMode === "multiple-choice" ? "Multiple Choice (1 mark)" : "Short Answer (1 mark)");
        
        // Generate question based on difficulty
        const questionDifficulty = calculateQuestionDifficulty(difficulty, bloomsLevel);
        const marks = getMarksForQuestionType(questionType);
        
        // Generate sample answer
        const sampleAnswer = generateSampleAnswer(topic, co.description, bloomsLevel, questionType);
        
        // Generate multiple choice options if needed
        let options = null;
        if (questionMode === "multiple-choice" || questionType.includes("Multiple Choice")) {
          options = generateMultipleChoiceOptions(topic, co.description);
        }
        
        generatedQuestions.push({
          id: `q${questionId++}`,
          text: `[${topic}] [CO${co.co_number}] Question related to ${co.description} (${bloomsLevel} level, ${questionDifficulty} difficulty)`,
          type: questionType,
          marks: marks,
          level: bloomsLevel,
          courseOutcome: co.co_number,
          selected: false,
          answer: sampleAnswer,
          options: options
        });
      }
    }
  } else {
    // If no course outcomes, generate default questions
    for (let i = 0; i < questionTypesList.length; i++) {
      const questionType = questionTypesList[i] || (questionMode === "multiple-choice" ? "Multiple Choice (1 mark)" : "Short Answer (1 mark)");
      let bloomsLevel = getRandomBloomsLevel(bloomsTaxonomy);
      const questionDifficulty = calculateQuestionDifficulty(difficulty, bloomsLevel);
      const marks = getMarksForQuestionType(questionType);
      
      // Generate sample answer
      const sampleAnswer = generateSampleAnswer(topic, "", bloomsLevel, questionType);
      
      // Generate multiple choice options if needed
      let options = null;
      if (questionMode === "multiple-choice" || questionType.includes("Multiple Choice")) {
        options = generateMultipleChoiceOptions(topic, "");
      }
      
      generatedQuestions.push({
        id: `q${questionId++}`,
        text: `[${topic}] Question about this topic (${bloomsLevel} level, ${questionDifficulty} difficulty)`,
        type: questionType,
        marks: marks,
        level: bloomsLevel,
        courseOutcome: null,
        selected: false,
        answer: sampleAnswer,
        options: options
      });
    }
  }
  
  return generatedQuestions;
}

function getRandomBloomsLevel(bloomsTaxonomy) {
  const levels = Object.keys(bloomsTaxonomy);
  const weights = Object.values(bloomsTaxonomy);
  
  // Normalize weights to ensure they sum to 1
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const normalizedWeights = weights.map(weight => weight / totalWeight);
  
  // Generate a random number between 0 and 1
  const random = Math.random();
  
  // Find the selected level based on weights
  let cumulativeWeight = 0;
  for (let i = 0; i < levels.length; i++) {
    cumulativeWeight += normalizedWeights[i];
    if (random <= cumulativeWeight) {
      return levels[i];
    }
  }
  
  // Fallback to the last level if something went wrong
  return levels[levels.length - 1];
}

function calculateQuestionDifficulty(overallDifficulty, bloomsLevel) {
  // Difficulty levels
  const difficultyLevels = ["easy", "moderate", "hard"];
  
  // Blooms taxonomy level weights (higher level = higher chance of harder question)
  const bloomsLevelWeights = {
    remember: { easy: 0.7, moderate: 0.2, hard: 0.1 },
    understand: { easy: 0.5, moderate: 0.4, hard: 0.1 },
    apply: { easy: 0.3, moderate: 0.5, hard: 0.2 },
    analyze: { easy: 0.2, moderate: 0.5, hard: 0.3 },
    evaluate: { easy: 0.1, moderate: 0.4, hard: 0.5 },
    create: { easy: 0.1, moderate: 0.3, hard: 0.6 }
  };
  
  // Adjust based on overall difficulty setting
  const difficultyFactor = overallDifficulty / 100;
  
  // Get weights for the specific blooms level
  const levelWeights = bloomsLevelWeights[bloomsLevel] || bloomsLevelWeights.understand;
  
  // Apply overall difficulty factor
  const adjustedWeights = {
    easy: levelWeights.easy * (1 - difficultyFactor),
    moderate: levelWeights.moderate,
    hard: levelWeights.hard * difficultyFactor
  };
  
  // Normalize weights
  const totalWeight = Object.values(adjustedWeights).reduce((sum, weight) => sum + weight, 0);
  const normalizedWeights = {
    easy: adjustedWeights.easy / totalWeight,
    moderate: adjustedWeights.moderate / totalWeight,
    hard: adjustedWeights.hard / totalWeight
  };
  
  // Select difficulty based on weights
  const random = Math.random();
  let cumulativeWeight = 0;
  
  for (const level of difficultyLevels) {
    cumulativeWeight += normalizedWeights[level];
    if (random <= cumulativeWeight) {
      return level;
    }
  }
  
  return "moderate"; // Default fallback
}

function getMarksForQuestionType(questionType) {
  if (!questionType) return 1;
  
  // Extract marks from question type if it contains a number in parentheses
  const marksMatch = questionType.match(/\((\d+)\s*marks?\)/i) || questionType.match(/\((\d+)\)/);
  if (marksMatch && marksMatch[1]) {
    return parseInt(marksMatch[1], 10);
  }
  
  // Otherwise, use defaults based on question type keywords
  if (questionType.toLowerCase().includes("multiple choice")) return 1;
  if (questionType.toLowerCase().includes("short")) return questionType.toLowerCase().includes("2") ? 2 : 1;
  if (questionType.toLowerCase().includes("medium")) return 4;
  if (questionType.toLowerCase().includes("long")) return 8;
  
  return 1; // Default fallback
}

function generateSampleAnswer(topic, courseOutcomeDesc, bloomsLevel, questionType) {
  // Generate a sample answer based on question parameters
  const answerLength = getAnswerLength(questionType);
  
  let answer = `Sample answer for a question about ${topic}`;
  
  if (courseOutcomeDesc) {
    answer += ` related to ${courseOutcomeDesc}`;
  }
  
  answer += `. This is a ${bloomsLevel} level question.`;
  
  // Add more detail for longer answers
  if (answerLength > 1) {
    answer += ` The answer should include key concepts and examples. `;
    
    if (answerLength > 2) {
      answer += `Students should demonstrate critical thinking and application of concepts. `;
      
      if (answerLength > 3) {
        answer += `A comprehensive answer would include theoretical framework, practical applications, and reflections on limitations or future directions.`;
      }
    }
  }
  
  return answer;
}

function getAnswerLength(questionType) {
  // Determine relative length of answer based on question type
  if (questionType.toLowerCase().includes("multiple choice")) return 1;
  if (questionType.toLowerCase().includes("short")) return 2;
  if (questionType.toLowerCase().includes("medium")) return 3;
  if (questionType.toLowerCase().includes("long")) return 4;
  
  return 2; // Default medium length
}

function generateMultipleChoiceOptions(topic, courseOutcomeDesc) {
  // Generate 4 options with one correct answer
  const correctIndex = Math.floor(Math.random() * 4);
  
  const options = [];
  for (let i = 0; i < 4; i++) {
    options.push({
      text: `Sample option ${i + 1} for ${topic}${courseOutcomeDesc ? ` related to ${courseOutcomeDesc}` : ''}`,
      isCorrect: i === correctIndex
    });
  }
  
  return options;
}
