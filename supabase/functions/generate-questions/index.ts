
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request data
    const { subject, topic, content, bloomsTaxonomy, difficulty } = await req.json();

    // Validate inputs
    if (!subject || !topic) {
      return new Response(
        JSON.stringify({ error: "Subject and topic are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare bloomsTaxonomy for prompting
    let bloomsString = "";
    if (bloomsTaxonomy) {
      bloomsString = Object.entries(bloomsTaxonomy)
        .map(([level, percentage]) => `${level}: ${percentage}%`)
        .join(", ");
    }

    // Create difficulty string
    const difficultyString = difficulty === 1 ? "Easy" : difficulty === 2 ? "Medium" : "Hard";

    // Truncate content if it's too large
    const truncatedContent = content && content.length > 8000 
      ? content.substring(0, 8000) + "..." 
      : content;

    // Create the prompt for OpenAI
    const prompt = `
      You are an expert teacher for the subject: ${subject}. 
      Your task is to generate questions for a test paper on the topic: "${topic}".
      
      Difficulty level: ${difficultyString}
      
      The questions should follow this Bloom's Taxonomy distribution:
      ${bloomsString}
      
      Here's the content on which to base the questions:
      ${truncatedContent || "No specific content provided, generate questions based on the topic."}
      
      Generate 20 questions covering different question types (multiple choice, short answer, essay, etc.) 
      and different cognitive levels according to the Bloom's taxonomy distribution.
      
      For each question, provide:
      1. The question text
      2. The question type (multiple choice, short answer, essay, etc.)
      3. The Bloom's taxonomy level (remember, understand, apply, analyze, evaluate, create)
      4. A brief answer or solution (for objective questions)
      
      Format your response as a JSON array where each object has these properties:
      {
        "text": "Question text",
        "type": "question type",
        "level": "bloom's taxonomy level",
        "answer": "answer or solution"
      }
    `;

    // Call OpenAI API
    console.log("Calling OpenAI API to generate questions");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful AI that generates educational content. Always respond with properly formatted JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    console.log("OpenAI API response received");

    if (!response.ok) {
      console.error("Error from OpenAI:", data);
      return new Response(
        JSON.stringify({ error: "Failed to generate questions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract the questions JSON from the response
    const generatedContent = data.choices[0].message.content;
    
    // Parse the JSON response (handling potential JSON formatting issues)
    let questions;
    try {
      // Try to extract JSON from the string if it's not already in JSON format
      const jsonMatch = generatedContent.match(/\[\s*\{.*\}\s*\]/s);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        questions = JSON.parse(generatedContent);
      }
      
      // Ensure it's an array
      if (!Array.isArray(questions)) {
        throw new Error("Generated content is not an array");
      }
    } catch (error) {
      console.error("Error parsing questions:", error);
      console.log("Raw content:", generatedContent);
      
      // Fallback: Return a formatted error with the raw content
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse generated questions", 
          rawContent: generatedContent 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ questions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-questions function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
