
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

    let fileText = '';
    
    if (content.fileUrl) {
      console.log('Analyzing document from URL:', content.fileUrl)
      const fileResponse = await fetch(content.fileUrl)
      if (!fileResponse.ok) {
        throw new Error('Failed to fetch document from storage')
      }
      fileText = await fileResponse.text()
    } else if (content.text) {
      console.log('Analyzing provided text content')
      fileText = content.text
    } else {
      throw new Error('No content provided for analysis')
    }

    console.log('Content length:', fileText.length)

    if (!fileText) {
      throw new Error('Could not extract text from the content')
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
            content: `You are an expert in analyzing question papers. Analyze the given question paper and provide:
            1. Topics covered with number of questions for each topic
            2. Difficulty distribution (Easy, Medium, Hard) as percentages
            3. Overall assessment of the paper quality, balance, and coverage
            4. Specific recommendations for improvement
            
            Format the response as a JSON object with these keys:
            {
              "topics": [{ "name": string, "questionCount": number }],
              "difficulty": [
                { "name": "Easy", "value": number },
                { "name": "Medium", "value": number },
                { "name": "Hard", "value": number }
              ],
              "overallAssessment": string,
              "recommendations": string[]
            }`
          },
          {
            role: 'user',
            content: fileText
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    })

    if (!openAIResponse.ok) {
      const error = await openAIResponse.json()
      console.error('OpenAI API error:', error)
      throw new Error('Failed to analyze paper')
    }

    const aiData = await openAIResponse.json()
    console.log('OpenAI Analysis completed successfully')
    
    try {
      // Parse the content to ensure it's valid JSON
      const analysis = JSON.parse(aiData.choices[0].message.content)
      return new Response(JSON.stringify(analysis), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error)
      throw new Error('Failed to parse analysis results')
    }
  } catch (error) {
    console.error('Error in process-document function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
