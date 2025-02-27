
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
    
    const systemPrompt = `You are an expert in analyzing question papers. Your task is to analyze the given question paper and return a JSON response in the exact format specified below:

{
  "bloomsTaxonomy": {
    "remember": number,
    "understand": number,
    "apply": number,
    "analyze": number,
    "evaluate": number,
    "create": number
  },
  "difficulty": [
    { "name": "Easy", "value": number },
    { "name": "Medium", "value": number },
    { "name": "Hard", "value": number }
  ],
  "questions": [
    {
      "topic": "string",
      "difficulty": "string (Easy/Medium/Hard)",
      "bloomsLevel": "string (Remember/Understand/Apply/Analyze/Evaluate/Create)",
      "questionText": "string"
    }
  ],
  "overallAssessment": "string",
  "recommendations": ["string"],
  "suggestedChanges": "string"
}

Important:
- All percentage values should sum to 100
- Analyze each question carefully for its cognitive level and difficulty
- Provide specific, actionable recommendations
- Each question must be categorized by topic, difficulty, and Bloom's taxonomy level
- The overall assessment should be comprehensive but concise`;

    const userPrompt = `Analyze this question paper and provide the analysis in the exact JSON format specified. Be specific and detailed in your analysis.

Topic: ${topicName}

Question Paper:
${text}`;

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
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.5, // Lower temperature for more consistent output
        max_tokens: 2000, // Increase max tokens to allow for detailed analysis
      }),
    });

    const aiResponse = await openaiResponse.json();
    
    if (!aiResponse.choices || !aiResponse.choices[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    const analysisText = aiResponse.choices[0].message.content;
    
    try {
      // Parse the AI response as JSON
      const analysis = JSON.parse(analysisText);
      
      // Validate the required fields
      if (!analysis.bloomsTaxonomy || !analysis.difficulty || !analysis.questions) {
        throw new Error('Missing required fields in analysis');
      }

      // Ensure percentages sum to 100
      const bloomsSum = Object.values(analysis.bloomsTaxonomy).reduce((a: number, b: number) => a + b, 0);
      const difficultySum = analysis.difficulty.reduce((a: number, b: any) => a + b.value, 0);

      if (Math.abs(bloomsSum - 100) > 0.1 || Math.abs(difficultySum - 100) > 0.1) {
        throw new Error('Percentages do not sum to 100');
      }

      return new Response(
        JSON.stringify(analysis),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.error('AI response:', analysisText);
      
      // Return a formatted error response
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
        questions: [
          {
            topic: "Error",
            difficulty: "Medium",
            bloomsLevel: "Understand",
            questionText: "Failed to analyze questions"
          }
        ],
        overallAssessment: "Failed to analyze the question paper. Error: " + error.message,
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
