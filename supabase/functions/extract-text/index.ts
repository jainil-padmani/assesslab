
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
    const { fileUrl, fileName } = await req.json();
    
    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: "File URL is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Download the file
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }
    
    const fileBlob = await fileResponse.blob();
    
    // Determine file type and extract text accordingly
    const fileType = fileName.split('.').pop()?.toLowerCase();
    let extractedText = "";
    
    if (fileType === 'txt') {
      // For text files, just read the content
      extractedText = await fileBlob.text();
    } else if (fileType === 'pdf') {
      // For PDFs, we need to use pdf.js to extract text
      // Basic extraction for demo purposes
      // In a real application, use a more robust PDF extraction library
      extractedText = `Extracted text from PDF: ${fileName}. 
      In a production environment, this would use a PDF extraction library to get the full text content.`;
    } else if (fileType === 'docx' || fileType === 'doc') {
      // For Word documents, ideally use a specialized library
      extractedText = `Extracted text from Word document: ${fileName}.
      In a production environment, this would use a Word document extraction library to get the full text content.`;
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    return new Response(
      JSON.stringify({ text: extractedText }),
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
