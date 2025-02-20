
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
            content: getSystemPrompt(action),
          },
          {
            role: 'user',
            content,
          },
        ],
      }),
    })

    const data = await openAIResponse.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function getSystemPrompt(action: string): string {
  switch (action) {
    case 'generate_questions':
      return 'You are an AI that generates exam questions based on study materials. Generate a mix of MCQ, short answer, and long answer questions.'
    case 'analyze_paper':
      return 'You are an AI that analyzes question papers. Identify topics covered, calculate difficulty levels, and provide detailed feedback.'
    case 'check_answers':
      return 'You are an AI that evaluates student answers against answer keys. Provide detailed feedback and scoring.'
    default:
      return 'You are a helpful AI assistant.'
  }
}
