
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
    if (!apiKey) {
      console.error("No OpenAI API key found in environment variables");
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

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
    
    // For PDF files, we need to ensure they can be processed by OpenAI
    if (fileUrl && fileUrl.toLowerCase().endsWith('.pdf')) {
      try {
        console.log("Processing PDF file using a different approach");
        // For PDFs, we'll extract text directly from the file if available
        // This is a simplified approach for demonstration
        return new Response(
          JSON.stringify({ 
            text: "PDF extraction not directly supported. Please convert the PDF to images or manually enter text.",
            is_pdf: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (pdfError) {
        console.error("Error processing PDF:", pdfError);
        return new Response(
          JSON.stringify({ error: `Error processing PDF: ${pdfError.message}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }
    
    // Process image files
    if (fileUrl && (fileUrl.toLowerCase().includes('.jpg') || fileUrl.toLowerCase().includes('.jpeg') || 
        fileUrl.toLowerCase().includes('.png'))) {
      
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
