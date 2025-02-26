
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analysis } = await req.json();

    // Create a detailed prompt for the report
    const reportPrompt = `
Generate a detailed academic analysis report based on the following data:

Bloom's Taxonomy Distribution:
${Object.entries(analysis.bloomsTaxonomy || {})
  .map(([level, value]) => `${level}: ${value}%`)
  .join('\n')}

Expected Bloom's Taxonomy Distribution:
${Object.entries(analysis.expectedBloomsTaxonomy || {})
  .map(([level, value]) => `${level}: ${value}%`)
  .join('\n')}

Topics Covered:
${(analysis.topics || [])
  .map((topic: any) => `- ${topic.name}: ${topic.questionCount} questions`)
  .join('\n')}

Overall Assessment: ${analysis.overallAssessment || 'Not provided'}

Based on this data, generate a comprehensive report that includes:
1. An executive summary of the question paper analysis
2. A detailed comparison between actual and expected Bloom's Taxonomy distributions
3. Analysis of topic coverage and balance
4. Specific strengths and areas for improvement
5. Recommendations for future question papers

Format the response in a clear, professional structure with sections and bullet points where appropriate.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in educational assessment and question paper analysis.'
          },
          {
            role: 'user',
            content: reportPrompt
          }
        ],
      }),
    });

    const data = await response.json();
    const reportContent = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ reportContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-report function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
