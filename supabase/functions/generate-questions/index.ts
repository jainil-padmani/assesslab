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
    const { topic, content, bloomsTaxonomy, difficulty, courseOutcomes } = await req.json();
    
    if (!topic || !content) {
      return new Response(
        JSON.stringify({ error: "Topic and content are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    if (!courseOutcomes || courseOutcomes.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one course outcome must be selected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    console.log(`Generating questions for ${topic} with difficulty ${difficulty}%`);
    console.log("Course outcomes:", courseOutcomes);
    
    // Total number of questions required
    const totalQuestions = courseOutcomes.reduce((total, co) => total + co.questionCount, 0);
    
    // Get the OpenAI API key
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key is not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Generate actual questions using OpenAI API
    const promptContent = `
Generate ${totalQuestions} exam questions for the topic: ${topic}.

Course Content:
${content.substring(0, 4000)}

Requirements:
- Questions should be appropriate for a college-level exam
- Create a variety of question types (multiple choice, short answer, problem solving, etc.)
- Questions should be aligned with the specified course outcomes and Bloom's taxonomy levels
- Difficulty level should be approximately ${difficulty}% on a scale of 0-100

Course Outcomes:
${courseOutcomes.filter(co => co.selected).map(co => `CO${co.co_number}: ${co.description}`).join('\n')}

Question Distribution:
${courseOutcomes.filter(co => co.selected).map(co => `- CO${co.co_number}: ${co.questionCount} questions`).join('\n')}

Bloom's Taxonomy distribution:
${Object.entries(bloomsTaxonomy).map(([level, value]) => `- ${level}: ${value}%`).join('\n')}

Format each question as:
{
  "text": "The question text here",
  "type": "question type (Multiple Choice, Short Answer, etc.)",
  "level": "bloom's taxonomy level (remember, understand, apply, analyze, evaluate, create)",
  "courseOutcome": CO number (integer),
  "marks": estimated marks based on difficulty and cognitive level
}
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
              "content": "You are an expert in generating educational assessment questions. Provide detailed, appropriate questions that align with course outcomes and Bloom's taxonomy levels."
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
              marks: question.marks || getMarksForQuestion(question.level, question.difficulty || "moderate"),
              level: question.level,
              courseOutcome: question.courseOutcome,
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
        generatedQuestions = generateFallbackQuestions(totalQuestions, courseOutcomes, bloomsTaxonomy, difficulty, topic);
      }
      
      console.log(`Generated ${generatedQuestions.length} questions`);
    
      return new Response(
        JSON.stringify({ questions: generatedQuestions }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (apiError) {
      console.error("Error calling OpenAI API:", apiError);
      
      // Fallback to local question generation
      const generatedQuestions = generateFallbackQuestions(totalQuestions, courseOutcomes, bloomsTaxonomy, difficulty, topic);
      
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

function generateFallbackQuestions(totalQuestions, courseOutcomes, bloomsTaxonomy, difficulty, topic) {
  const generatedQuestions = [];
  let questionId = 1;
  
  // Generate questions for each course outcome
  for (const co of courseOutcomes) {
    if (!co.selected) continue;
    
    for (let i = 0; i < co.questionCount; i++) {
      // Determine Bloom's taxonomy level based on distribution
      let bloomsLevel = getRandomBloomsLevel(bloomsTaxonomy);
      
      // Generate question based on difficulty
      const questionDifficulty = calculateQuestionDifficulty(difficulty, bloomsLevel);
      const questionType = getRandomQuestionType(bloomsLevel);
      const marks = getMarksForQuestion(bloomsLevel, questionDifficulty);
      
      generatedQuestions.push({
        id: `q${questionId++}`,
        text: `[${topic}] [CO${co.co_number}] Question related to ${co.description} (${bloomsLevel} level, ${questionDifficulty} difficulty)`,
        type: questionType,
        marks: marks,
        level: bloomsLevel,
        courseOutcome: co.co_number,
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

function getRandomQuestionType(bloomsLevel) {
  const questionTypes = {
    remember: ["Multiple Choice", "Short Answer", "Fill in the Blank"],
    understand: ["Multiple Choice", "Short Answer", "True/False", "Matching"],
    apply: ["Problem Solving", "Short Answer", "Case Study"],
    analyze: ["Essay", "Case Study", "Problem Solving"],
    evaluate: ["Essay", "Critical Analysis", "Comparison"],
    create: ["Design Question", "Creative Response", "Project Proposal"]
  };
  
  const types = questionTypes[bloomsLevel] || ["Short Answer"];
  return types[Math.floor(Math.random() * types.length)];
}

function getMarksForQuestion(bloomsLevel, difficulty) {
  // Higher cognitive levels and harder questions get more marks
  const baseMarks = {
    remember: 1,
    understand: 2,
    apply: 3,
    analyze: 4,
    evaluate: 5,
    create: 5
  }[bloomsLevel] || 2;
  
  const difficultyMultiplier = {
    easy: 1,
    moderate: 1.5,
    hard: 2
  }[difficulty] || 1;
  
  return Math.round(baseMarks * difficultyMultiplier);
}
