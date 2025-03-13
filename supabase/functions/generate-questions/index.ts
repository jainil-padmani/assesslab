
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
    
    // Mock generated questions for demonstration
    // In a real implementation, this would call OpenAI or another AI service
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
          selected: false
        });
      }
    }
    
    console.log(`Generated ${generatedQuestions.length} questions`);
    
    return new Response(
      JSON.stringify({ questions: generatedQuestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error generating questions:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

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
