
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

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
    // Get the request data
    const {
      subject,
      subjectCode,
      topic,
      questions,
      headerUrl,
      footerUrl
    } = await req.json();

    // Validate inputs
    if (!subject || !topic || !questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Subject, topic, and at least one question are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get only selected questions
    const selectedQuestions = questions.filter(q => q.selected);
    if (selectedQuestions.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one question must be selected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Setup Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get header and footer content if URLs are provided
    let headerContent = "";
    let footerContent = "";

    if (headerUrl) {
      try {
        const headerResponse = await fetch(headerUrl);
        if (headerResponse.ok) {
          headerContent = await headerResponse.text();
        }
      } catch (error) {
        console.error("Error fetching header:", error);
      }
    }

    if (footerUrl) {
      try {
        const footerResponse = await fetch(footerUrl);
        if (footerResponse.ok) {
          footerContent = await footerResponse.text();
        }
      } catch (error) {
        console.error("Error fetching footer:", error);
      }
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Generate formatted questions by type
    const questionsByType = selectedQuestions.reduce((acc, q) => {
      if (!acc[q.type]) {
        acc[q.type] = [];
      }
      acc[q.type].push(q);
      return acc;
    }, {});

    // Create paper content
    let paperContent = "";

    // Add header if available
    if (headerContent) {
      paperContent += headerContent + "\n\n";
    } else {
      // Create a default header
      paperContent += `
===========================================
${subject.toUpperCase()} (${subjectCode || 'N/A'})
TOPIC: ${topic.toUpperCase()}
DATE: ${currentDate}
===========================================\n\n`;
    }

    // Add instructions
    paperContent += "INSTRUCTIONS: Answer all questions. Write clearly and show all working where applicable.\n\n";

    // Add questions by type
    let questionNumber = 1;
    for (const [type, questions] of Object.entries(questionsByType)) {
      paperContent += `${type.toUpperCase()} QUESTIONS:\n\n`;
      
      for (const question of questions) {
        paperContent += `${questionNumber}. ${question.text}\n`;
        if (type.toLowerCase().includes("multiple choice")) {
          // Add placeholder for options if it's a multiple choice question
          paperContent += "   a) [Option A]\n";
          paperContent += "   b) [Option B]\n";
          paperContent += "   c) [Option C]\n";
          paperContent += "   d) [Option D]\n";
        }
        paperContent += "\n";
        questionNumber++;
      }
      
      paperContent += "\n";
    }

    // Add footer if available
    if (footerContent) {
      paperContent += "\n" + footerContent;
    } else {
      // Create a default footer
      paperContent += "\n===========================================\n";
      paperContent += "END OF PAPER\n";
      paperContent += "===========================================\n";
    }

    // Generate a file name for the paper
    const timestamp = Date.now();
    const sanitizedTopic = topic.replace(/\s+/g, '_').toLowerCase();
    const paperFileName = `${sanitizedTopic}_${subject.replace(/\s+/g, '_').toLowerCase()}_paper_${timestamp}.txt`;

    // Save the paper to Supabase storage
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('files')
      .upload(paperFileName, new Blob([paperContent], { type: 'text/plain' }), {
        cacheControl: '3600',
        upsert: false
      });

    if (storageError) {
      throw new Error(`Failed to save paper: ${storageError.message}`);
    }

    // Get the public URL for the saved paper
    const { data: { publicUrl } } = supabase
      .storage
      .from('files')
      .getPublicUrl(paperFileName);

    return new Response(
      JSON.stringify({
        paperContent,
        paperUrl: publicUrl,
        fileName: paperFileName
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-paper function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
