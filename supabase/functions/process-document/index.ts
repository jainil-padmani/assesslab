
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
    
    const systemPrompt = `You are an AI assistant specialized in analyzing question papers. You must return ONLY a JSON object without any additional text, markdown formatting, or code blocks. The response must strictly follow this structure:

{
  "bloomsTaxonomy": {
    "remember": <number 0-100>,
    "understand": <number 0-100>,
    "apply": <number 0-100>,
    "analyze": <number 0-100>,
    "evaluate": <number 0-100>,
    "create": <number 0-100>
  },
  "difficulty": [
    {"name": "Easy", "value": <number 0-100>},
    {"name": "Medium", "value": <number 0-100>},
    {"name": "Hard", "value": <number 0-100>}
  ],
  "questions": [
    {
      "topic": "<subtopic name>",
      "difficulty": "<Easy/Medium/Hard>",
      "bloomsLevel": "<Remember/Understand/Apply/Analyze/Evaluate/Create>",
      "questionText": "<question text>"
    }
  ],
  "overallAssessment": "<comprehensive assessment of the paper>",
  "recommendations": [
    "<specific recommendation 1>",
    "<specific recommendation 2>",
    "<specific recommendation 3>"
  ],
  "suggestedChanges": "<specific suggestions for improving the paper>"
}

Rules:
1. All percentage values (difficulty and bloomsTaxonomy) MUST sum to 100
2. Only output valid JSON without any markdown or code formatting
3. Each question must be analyzed for:
   - The specific subtopic it covers
   - Its difficulty level
   - Its Bloom's taxonomy level
4. Provide actionable recommendations
5. Include specific suggestions for improvements`;

    const userPrompt = `Based on the following question paper, generate a detailed analysis in the specified JSON format. Do not include any markdown formatting or additional text.

Topic: ${topicName}

${text}`;

    console.log('Sending request to OpenAI...');
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
        temperature: 0.3, // Lower temperature for more consistent output
        max_tokens: 2500, // Increased for longer analyses
        response_format: { type: "json_object" } // Force JSON response
      }),
    });

    const aiResponse = await openaiResponse.json();
    console.log('Received response from OpenAI');
    
    if (!aiResponse.choices || !aiResponse.choices[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    const analysisText = aiResponse.choices[0].message.content;
    console.log('Analysis text:', analysisText);
    
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

      console.log('Successfully parsed and validated analysis');
      return new Response(
        JSON.stringify(analysis),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.error('Raw AI response:', analysisText);
      
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
            topic: topicName,
            difficulty: "Medium",
            bloomsLevel: "Understand",
            questionText: "Error analyzing questions: " + error.message
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
