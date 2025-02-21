
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { action, content } = await req.json()
    const openAIKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openAIKey) {
      throw new Error('OpenAI API key not configured')
    }

    if (action !== 'analyze_paper') {
      throw new Error('Invalid action')
    }

    // Download the file from Supabase storage
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const response = await fetch(content.fileUrl)
    const fileText = await response.text()

    // Analyze the paper using OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert in analyzing question papers. Analyze the given question paper and provide:
            1. Topics covered with number of questions for each topic
            2. Difficulty distribution (Easy, Medium, Hard) as percentages
            3. Overall assessment
            4. Recommendations for improvement
            
            Format the response as a JSON object with these keys:
            {
              topics: [{ name: string, questionCount: number }],
              difficulty: [{ name: string, value: number }],
              overallAssessment: string,
              recommendations: string[]
            }`
          },
          {
            role: 'user',
            content: fileText
          }
        ],
      }),
    })

    const aiData = await openAIResponse.json()
    const analysis = JSON.parse(aiData.choices[0].message.content)

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
