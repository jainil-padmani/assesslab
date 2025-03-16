
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import * as puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

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
    const { subjectName, subjectCode, topicName, headerUrl, questions } = await req.json();
    
    if (!subjectName || !topicName || !questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Subject, topic and questions are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    console.log(`Generating paper for ${subjectName} (${subjectCode}): ${topicName}`);
    console.log(`Selected ${questions.length} questions`);
    
    // Get header content if provided
    let headerContent = "";
    
    if (headerUrl) {
      const headerResponse = await fetch(headerUrl);
      if (headerResponse.ok) {
        headerContent = await headerResponse.text();
      } else {
        console.warn("Failed to fetch header content");
      }
    }
    
    // Create HTML for the paper
    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Calculate total marks
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
    
    // Group questions by course outcomes
    const questionsByCO = {};
    questions.forEach(q => {
      const coNumber = q.courseOutcome || 0;
      if (!questionsByCO[coNumber]) {
        questionsByCO[coNumber] = [];
      }
      questionsByCO[coNumber].push(q);
    });
    
    let paperHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${subjectName} - ${topicName} Test Paper</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          color: #333;
        }
        .container {
          width: 21cm;
          margin: 0 auto;
          padding: 2cm;
        }
        .header {
          text-align: center;
          margin-bottom: 2cm;
        }
        .footer {
          text-align: center;
          margin-top: 2cm;
          font-size: 0.8em;
          color: #666;
        }
        h1, h2 {
          text-align: center;
        }
        .co-section {
          margin-bottom: 1.5em;
        }
        .co-header {
          font-weight: bold;
          margin-bottom: 0.5em;
          padding: 0.5em;
          background-color: #f0f0f0;
          border-radius: 4px;
        }
        .question {
          margin-bottom: 1.5em;
        }
        .question-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
        }
        .question-info {
          font-size: 0.8em;
          color: #666;
          margin-top: 0.3em;
        }
        .answer-space {
          height: 5em;
          border-bottom: 1px solid #ccc;
        }
        @media print {
          .container {
            width: 100%;
            padding: 1cm;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${headerContent || `
            <h1>${subjectName} ${subjectCode ? `(${subjectCode})` : ''}</h1>
            <h2>${topicName} - Test Paper</h2>
            <p>Date: ${date}</p>
            <p>Total Marks: ${totalMarks}</p>
            <p>Time: ${Math.ceil(totalMarks / 2)} minutes</p>
          `}
        </div>
        
        <div class="questions">
    `;
    
    // Add questions by course outcome
    let questionNumber = 1;
    
    // Handle general questions first (no CO)
    if (questionsByCO[0] && questionsByCO[0].length > 0) {
      paperHtml += `
        <div class="co-section">
          <div class="co-header">General Questions</div>
      `;
      
      questionsByCO[0].forEach((q) => {
        paperHtml += `
          <div class="question">
            <div class="question-header">
              <span>Q${questionNumber++}. ${q.text}</span>
              <span>(${q.marks} marks)</span>
            </div>
            <div class="question-info">
              Type: ${q.type || 'Text'}, Level: ${q.level}
            </div>
            <div class="answer-space"></div>
          </div>
        `;
      });
      
      paperHtml += `</div>`;
    }
    
    // Then add questions by CO (skip 0 which was handled above)
    Object.keys(questionsByCO)
      .map(Number)
      .filter(coNum => coNum > 0)
      .sort((a, b) => a - b)
      .forEach(coNum => {
        const coQuestions = questionsByCO[coNum];
        
        if (coQuestions && coQuestions.length > 0) {
          paperHtml += `
            <div class="co-section">
              <div class="co-header">Course Outcome ${coNum}</div>
          `;
          
          coQuestions.forEach((q) => {
            paperHtml += `
              <div class="question">
                <div class="question-header">
                  <span>Q${questionNumber++}. ${q.text}</span>
                  <span>(${q.marks} marks)</span>
                </div>
                <div class="question-info">
                  Type: ${q.type || 'Text'}, Level: ${q.level}
                </div>
                <div class="answer-space"></div>
              </div>
            `;
          });
          
          paperHtml += `</div>`;
        }
      });
    
    paperHtml += `
        </div>
        
        <div class="footer">
          <p>End of Paper</p>
          <p>${subjectName} - ${topicName} Test | Total Marks: ${totalMarks}</p>
        </div>
      </div>
    </body>
    </html>
    `;
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase URL or anon key not found");
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Create a unique file name
    const timestamp = Date.now();
    const htmlFileName = `paper_${timestamp}.html`;
    const pdfFileName = `paper_${timestamp}.pdf`;
    
    // Upload the HTML file to Supabase Storage
    const { data: htmlData, error: htmlError } = await supabase.storage
      .from('files')
      .upload(htmlFileName, new Blob([paperHtml], { type: 'text/html' }), {
        cacheControl: '3600',
        upsert: false,
      });
    
    if (htmlError) {
      console.error(`Error uploading HTML: ${htmlError.message}`);
      throw new Error(`Error uploading HTML: ${htmlError.message}`);
    }
    
    // Get the public URL for HTML
    const { data: htmlUrlData } = await supabase.storage
      .from('files')
      .getPublicUrl(htmlFileName);
    
    if (!htmlUrlData || !htmlUrlData.publicUrl) {
      console.error("Failed to get HTML public URL");
      throw new Error("Failed to get HTML public URL");
    }
    
    console.log("HTML paper saved at:", htmlUrlData.publicUrl);
    
    // Return early with HTML URL only
    return new Response(
      JSON.stringify({ 
        paperUrl: htmlUrlData.publicUrl,
        pdfUrl: null,
        htmlOnly: true
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
    // NOTE: The PDF generation code below is intentionally skipped for now since Puppeteer
    // has been causing issues. We'll return the HTML version only which will still be displayable
    // in the iframe.

    /* PDF Generation code commented out intentionally
    // Generate PDF from HTML using Puppeteer
    console.log("Generating PDF...");
    let pdfBuffer: Uint8Array;
    
    try {
      const browser = await puppeteer.launch({ 
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true
      });
      const page = await browser.newPage();
      
      // Set the content
      await page.setContent(paperHtml, { waitUntil: 'networkidle0' });
      
      // Set page size to A4
      await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        }
      });
      
      // Generate PDF buffer
      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        }
      });
      
      await browser.close();
    } catch (err) {
      console.error("Error generating PDF:", err);
      // If PDF generation fails, we'll continue with just the HTML
      return new Response(
        JSON.stringify({ 
          paperUrl: htmlUrlData.publicUrl,
          pdfUrl: null,
          error: "PDF generation failed, but HTML is available"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Upload PDF to Supabase Storage
    const { data: pdfData, error: pdfError } = await supabase.storage
      .from('files')
      .upload(pdfFileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false,
      });
    
    if (pdfError) {
      console.error("Error uploading PDF:", pdfError);
      // If PDF upload fails, we'll continue with just the HTML
      return new Response(
        JSON.stringify({ 
          paperUrl: htmlUrlData.publicUrl,
          pdfUrl: null,
          error: "PDF upload failed, but HTML is available"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get the public URL for PDF
    const { data: pdfUrlData } = await supabase.storage
      .from('files')
      .getPublicUrl(pdfFileName);
    
    console.log("Paper and PDF generated successfully");
    
    return new Response(
      JSON.stringify({ 
        paperUrl: htmlUrlData.publicUrl,
        pdfUrl: pdfUrlData.publicUrl
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    */
    
  } catch (error) {
    console.error("Error generating paper:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
