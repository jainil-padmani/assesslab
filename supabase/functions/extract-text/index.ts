
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { extractTextFromZip, extractTextFromFile, extractTextFromTextFile, getSystemPrompt } from "./text-extractor.ts";

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
    const { fileUrl, fileName, fileType, zipUrl } = await req.json();
    
    if (!fileUrl && !zipUrl) {
      return new Response(
        JSON.stringify({ error: "File URL or ZIP URL is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    console.log(`Processing ${fileType || 'document'} extraction for: ${fileName || 'unknown file'}`);
    console.log(`Using file URL: ${fileUrl || 'N/A'}, ZIP URL: ${zipUrl || 'N/A'}`);
    
    // Get appropriate system prompt based on file type
    const systemPrompt = getSystemPrompt(fileType);
    
    // Process ZIP file first if available (preferred for PDF batch processing)
    if (zipUrl) {
      try {
        const extractedText = await extractTextFromZip(zipUrl, apiKey, systemPrompt);
        
        return new Response(
          JSON.stringify({ text: extractedText }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (zipError) {
        console.error("Error processing ZIP:", zipError);
        return new Response(
          JSON.stringify({ error: `Error processing ZIP: ${zipError.message}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }
    
    // Process single files if no ZIP is available
    if (fileUrl && (fileUrl.includes('.jpg') || fileUrl.includes('.jpeg') || 
        fileUrl.includes('.png') || fileUrl.includes('.pdf'))) {
      
      try {
        const userPrompt = `This is a ${fileType || 'document'} that needs text extraction. Extract all the text from it:`;
        
        const extractedText = await extractTextFromFile(fileUrl, apiKey, systemPrompt, userPrompt);
        
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
    try {
      const fileContent = await extractTextFromTextFile(fileUrl);
      
      return new Response(
        JSON.stringify({ text: fileContent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error reading text file:", error);
      return new Response(
        JSON.stringify({ error: `Error reading text file: ${error.message}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
  } catch (error) {
    console.error("Error extracting text:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
