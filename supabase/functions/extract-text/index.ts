
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
    // Check if it's a form data request
    const contentType = req.headers.get("content-type") || "";
    
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "Request must include form data with a file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file");
    
    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: "No file found in request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get file extension
    const fileName = file.name;
    const fileExt = fileName.split('.').pop()?.toLowerCase();
    
    // For text files, just read the content
    if (fileExt === 'txt') {
      const text = await file.text();
      return new Response(
        JSON.stringify({ text }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // For PDF and DOCX files, use OpenAI to extract text
    if (fileExt === 'pdf' || fileExt === 'docx' || fileExt === 'doc') {
      const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openaiApiKey) {
        return new Response(
          JSON.stringify({ error: "OpenAI API key is not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64String = btoa(String.fromCharCode(...uint8Array));
      
      // Create prompt for text extraction
      const messages = [
        {
          role: "system",
          content: "You are a document processing assistant. Extract all text content from the provided document accurately."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all the text content from this document. Maintain paragraph structure where possible."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/${fileExt === 'pdf' ? 'pdf' : 'msword'};base64,${base64String}`
              }
            }
          ]
        }
      ];
      
      // Call OpenAI API
      console.log(`Processing ${fileExt} file for text extraction`);
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages,
          temperature: 0.1,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error("Error from OpenAI:", data);
        return new Response(
          JSON.stringify({ error: "Failed to extract text from document" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const extractedText = data.choices[0].message.content;
      return new Response(
        JSON.stringify({ text: extractedText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Unsupported file type
    return new Response(
      JSON.stringify({ error: "Unsupported file type. Please upload a PDF, DOCX, or TXT file." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error extracting text:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
