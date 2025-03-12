
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
    const { topic, content, bloomsTaxonomy, difficulty } = await req.json();
    
    if (!topic || !content) {
      return new Response(
        JSON.stringify({ error: "Topic and content are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key not found");
    }
    
    console.log("Generating questions for topic:", topic);
    console.log("Bloom's Taxonomy weights:", JSON.stringify(bloomsTaxonomy));
    console.log("Difficulty level:", difficulty);
    
    // Create the prompt for OpenAI
    const systemPrompt = `You are an expert teacher who can create high-quality questions for exams based on provided content.
    Your task is to generate questions at various difficulty levels and cognitive domains according to Bloom's taxonomy.
    
    The questions should be relevant to the topic and based on the provided content. Each question should include:
    1. A unique ID
    2. The question text
    3. The question type (e.g., short answer, long answer, multiple choice)
    4. The number of marks for the question (between 1 and 10)
    5. The Bloom's taxonomy level (remember, understand, apply, analyze, evaluate, create)
    
    The difficulty level is ${difficulty}% (where 0% is very easy and 100% is very difficult).
    
    Use the following Bloom's taxonomy weights to distribute questions:
    ${JSON.stringify(bloomsTaxonomy, null, 2)}
    
    Generate a total of 15-20 questions of various types.`;
    
    const userPrompt = `Topic: ${topic}
    
    Content: ${content.slice(0, 8000)}`;  // Limit content length to avoid token limits
    
    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2500,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }
    
    const openaiData = await response.json();
    
    // Parse the response to extract questions
    // The AI response should be in a structured JSON format
    // We'll extract it and convert to our question format
    
    let questions = [];
    try {
      const content = openaiData.choices[0].message.content;
      
      // Try to extract JSON from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                       content.match(/```\n([\s\S]*?)\n```/) ||
                       content.match(/\[\s*\{\s*"id"/);
      
      if (jsonMatch) {
        // If JSON is found in code blocks, parse it
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        questions = JSON.parse(jsonStr);
      } else {
        // If no JSON format is found, try to parse the entire content
        questions = JSON.parse(content);
      }
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      console.log("Raw response:", openaiData.choices[0].message.content);
      
      // Fallback: generate some simple questions if parsing fails
      questions = [
        {
          id: "q1",
          text: `What are the key concepts of ${topic}?`,
          type: "Long answer",
          marks: 5,
          level: "understand"
        },
        {
          id: "q2",
          text: `Define ${topic} in your own words.`,
          type: "Short answer",
          marks: 3,
          level: "remember"
        },
        {
          id: "q3",
          text: `Apply the principles of ${topic} to solve a real-world problem.`,
          type: "Long answer",
          marks: 8,
          level: "apply"
        }
      ];
    }
    
    // Make sure all questions have the required fields and add a selected flag
    questions = questions.map((q, index) => ({
      id: q.id || `q${index + 1}`,
      text: q.text || q.question || `Question ${index + 1}`,
      type: q.type || "Short answer",
      marks: q.marks || q.mark || 5,
      level: q.level || "understand",
      selected: false
    }));
    
    console.log(`Generated ${questions.length} questions successfully`);
    
    return new Response(
      JSON.stringify({ questions }),
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
