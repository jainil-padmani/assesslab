
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
    const apiKey = Deno.env.get('OPENAI_API_KEY') || '';
    const { fileUrl, fileName, fileType } = await req.json();
    
    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: "File URL is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    console.log(`Processing ${fileType || 'document'} extraction for: ${fileName || 'unknown file'}`);
    
    // Use OpenAI's GPT-4o for OCR on the document
    let systemPrompt = "You are an OCR expert specialized in extracting text from documents.";
    
    if (fileType === 'question_paper') {
      systemPrompt = `You are an OCR expert specialized in extracting text from question papers.
      
      For each question in the document:
      1. Identify the question number clearly.
      2. Extract the complete question text along with any subparts.
      3. Format each question on a new line starting with "Q<number>:" followed by the question.
      4. Preserve the structure of mathematical equations, diagrams descriptions, and any special formatting.
      5. Include all instructions, marks allocations, and other relevant information.
      
      Your response should be structured, accurate, and preserve the original content's organization.`;
    } else if (fileType === 'answer_key') {
      systemPrompt = `You are an OCR expert specialized in extracting text from answer keys.
      
      For each answer in the document:
      1. Identify the question number clearly.
      2. Extract the complete answer text along with any marking guidelines.
      3. Format each answer on a new line starting with "Q<number>:" followed by the answer.
      4. Preserve the structure of mathematical equations, diagrams, and any special formatting.
      5. Include all marking schemes, points allocation, and other evaluation criteria.
      
      Your response should be structured, accurate, and preserve the original content's organization.`;
    } else if (fileType === 'answer_sheet') {
      systemPrompt = `You are an OCR expert specialized in extracting text from handwritten answer sheets and documents.
      
      For each question in the document:
      1. Identify the question number clearly.
      2. Extract the complete answer text.
      3. Format each answer on a new line starting with "Q<number>:" followed by the answer.
      4. If the handwriting is difficult to read, make your best effort and indicate uncertainty with [?].
      5. Maintain the structure of mathematical equations, diagrams descriptions, and any special formatting.
      6. If you identify multiple pages, process each and maintain continuity between questions.
      
      Your response should be structured, accurate, and preserve the original content's organization.`;
    }
    
    // Check if the file is an image or PDF
    if (fileUrl.includes('.jpg') || fileUrl.includes('.jpeg') || 
        fileUrl.includes('.png') || fileUrl.includes('.pdf')) {
      
      console.log("Image or PDF detected, using GPT-4o vision for OCR...");
      
      const userPrompt = `This is a ${fileType || 'document'} that needs text extraction. Extract all the text from it:`;
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        
        const ocrResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: systemPrompt },
              { 
                role: 'user', 
                content: [
                  { type: 'text', text: userPrompt },
                  { 
                    type: 'image_url', 
                    image_url: { 
                      url: fileUrl,
                      detail: "high" 
                    } 
                  }
                ] 
              }
            ],
            temperature: 0.2,
            max_tokens: 4000,
          }),
        });
        
        clearTimeout(timeoutId);
        
        if (!ocrResponse.ok) {
          const errorText = await ocrResponse.text();
          console.error("OpenAI OCR error:", errorText);
          return new Response(
            JSON.stringify({ error: `OCR extraction failed: ${errorText}` }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }
        
        const ocrResult = await ocrResponse.json();
        const extractedText = ocrResult.choices[0]?.message?.content;
        
        console.log("OCR extraction successful, extracted text length:", extractedText?.length || 0);
        console.log("Sample extracted text:", extractedText?.substring(0, 100) + "...");
        
        return new Response(
          JSON.stringify({ text: extractedText }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error in OCR extraction:", error);
        return new Response(
          JSON.stringify({ error: `Error in OCR extraction: ${error.message}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }
    
    // For text files, just read the content
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }
    
    const fileBlob = await fileResponse.blob();
    const fileContent = await fileBlob.text();
    
    return new Response(
      JSON.stringify({ text: fileContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error extracting text:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
