
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { extract as extractPDF } from 'https://deno.land/x/pdf_extract@v0.1.2/mod.ts'

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

    console.log('Analyzing document from URL:', content.fileUrl)

    // Download the file content from Supabase storage
    const fileResponse = await fetch(content.fileUrl)
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch document from storage')
    }

    // Get the content type from the response
    const contentType = fileResponse.headers.get('content-type')
    let fileText = ''

    if (contentType?.includes('pdf')) {
      // Handle PDF files
      const fileBuffer = await fileResponse.arrayBuffer()
      const pdfContent = await extractPDF(new Uint8Array(fileBuffer))
      fileText = pdfContent.text
    } else {
      // Handle other text-based formats (DOCX, TXT)
      fileText = await fileResponse.text()
    }

    if (!fileText) {
      throw new Error('Could not extract text from the document')
    }
    
    console.log('Successfully extracted text from document')

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
    
    let analysis
    try {
      analysis = JSON.parse(aiData.choices[0].message.content)
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error)
      throw new Error('Failed to parse analysis results')
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in process-document function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
