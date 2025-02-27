
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, content, topicName } = await req.json();

    if (action !== 'analyze_paper') {
      throw new Error('Invalid action');
    }

    const text = content.text || 'Sample text for analysis';
    
    // Analyze the text using OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert in analyzing question papers. Analyze the given question paper and provide:
            1. Difficulty distribution (Easy, Medium, Hard)
            2. Bloom's taxonomy levels for each question
            3. Topic-wise analysis
            4. Overall assessment and recommendations
            5. Question-by-question analysis with difficulty and Bloom's level
            Format the response in a structured JSON format.`
          },
          {
            role: 'user',
            content: `Topic: ${topicName}\n\nQuestion Paper: ${text}`
          }
        ],
      }),
    });

    const aiResponse = await openaiResponse.json();
    const analysisText = aiResponse.choices[0].message.content;
    
    try {
      // Parse the AI response as JSON
      const analysis = JSON.parse(analysisText);
      
      return new Response(
        JSON.stringify(analysis),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Error parsing AI response:', error);
      // If parsing fails, return a formatted response
      const defaultAnalysis = {
        bloomsTaxonomy: {
          remember: 20,
          understand: 20,
          apply: 20,
          analyze: 20,
          evaluate: 10,
          create: 10
        },
        difficulty: [
          { name: 'Easy', value: 30 },
          { name: 'Medium', value: 40 },
          { name: 'Hard', value: 30 }
        ],
        questions: [],
        topics: [],
        overallAssessment: "Analysis failed to parse AI response.",
        recommendations: ["Please try again with a clearer question paper format."],
        suggestedChanges: "Unable to provide specific suggestions due to parsing error."
      };
      
      return new Response(
        JSON.stringify(defaultAnalysis),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in process-document function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
