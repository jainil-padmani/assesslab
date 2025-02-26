import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import type { BloomsTaxonomy } from '../../../src/types/dashboard.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, content, subjectId } = await req.json();

    if (action === 'analyze_paper') {
      const textToAnalyze = content.text || await fetchTextFromUrl(content.fileUrl);

      console.log("Analyzing text:", textToAnalyze);

      const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an expert in educational assessment. Given a set of questions, identify the core topics covered, difficulty levels, and Bloom's Taxonomy levels. Format your response exactly as follows:

Difficulty Distribution:
- Easy: X%
- Medium: X%
- Hard: X%

Topics Covered:
- [Topic Name]: [Number] questions
(List every distinct topic covered in the questions, with the exact count of questions for each topic)

Overall Assessment:
[Provide a detailed assessment of the question paper's quality, balance, and effectiveness]

Recommendations:
- [Specific recommendation 1]
- [Specific recommendation 2]
[List actionable recommendations for improvement]

Bloom's Taxonomy Distribution:
- Remember: X%
- Understand: X%
- Apply: X%
- Analyze: X%
- Evaluate: X%
- Create: X%

Important: For Topics Covered, analyze each question's content and list ALL distinct topics mentioned or implied. For example, in a Deep Learning paper, topics might include Neural Networks, Activation Functions, Optimization, etc.`
            },
            {
              role: 'user',
              content: `Analyze these questions thoroughly. For each question, identify its topic and ensure it's listed in the Topics Covered section:

${textToAnalyze}`
            }
          ],
          temperature: 0.7,
        }),
      });

      const analysisData = await analysisResponse.json();
      const analysis = analysisData.choices[0].message.content;

      console.log("AI Response:", analysis);

      // Parse the analysis sections
      const result = {
        difficulty: extractDifficulty(analysis),
        topics: extractTopics(analysis),
        overallAssessment: extractOverallAssessment(analysis),
        recommendations: extractRecommendations(analysis),
        bloomsTaxonomy: extractBloomsDistribution(analysis),
      };

      console.log("Processed result:", JSON.stringify(result, null, 2));

      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error(`Unsupported action: ${action}`);
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function extractDifficulty(analysis: string): Array<{ name: string; value: number }> {
  const difficulties: Array<{ name: string; value: number }> = [];
  const sections = analysis.split('\n');
  const difficultyIndex = sections.findIndex(line => 
    line.toLowerCase().includes('difficulty distribution:')
  );

  if (difficultyIndex !== -1) {
    const difficultyLevels = ['Easy', 'Medium', 'Hard'];
    
    for (let i = difficultyIndex + 1; i < sections.length; i++) {
      const line = sections[i].trim().toLowerCase();
      if (!line || line.includes('topics covered:')) break;

      difficultyLevels.forEach(level => {
        if (line.includes(level.toLowerCase())) {
          const value = extractPercentage(line);
          if (!isNaN(value)) {
            difficulties.push({ name: level, value });
          }
        }
      });
    }
  }

  return difficulties;
}

function extractTopics(analysis: string): Array<{ name: string; questionCount: number }> {
  const topics: Array<{ name: string; questionCount: number }> = [];
  const sections = analysis.split('\n');
  let topicsSection = false;
  
  for (let i = 0; i < sections.length; i++) {
    const line = sections[i].trim();
    
    if (line.toLowerCase().includes('topics covered:')) {
      topicsSection = true;
      continue;
    }
    
    if (topicsSection) {
      if (line === '' || line.toLowerCase().includes('overall assessment:')) {
        break;
      }
      
      // Match different possible formats of topic listings
      const matches = line.match(/^[-•*]?\s*([^:]+?)(?::\s*(\d+)|.*?(\d+)\s*questions?)/i);
      if (matches) {
        const name = matches[1].trim();
        const count = parseInt(matches[2] || matches[3]);
        if (name && !isNaN(count)) {
          topics.push({ name, questionCount: count });
        }
      }
    }
  }
  
  return topics;
}

function extractBloomsDistribution(analysis: string): BloomsTaxonomy {
  const distribution = {
    remember: 0,
    understand: 0,
    apply: 0,
    analyze: 0,
    evaluate: 0,
    create: 0
  };

  const sections = analysis.toLowerCase().split('\n');
  const bloomsIndex = sections.findIndex(line => 
    line.includes("bloom's taxonomy distribution:")
  );

  if (bloomsIndex !== -1) {
    for (let i = bloomsIndex + 1; i < sections.length; i++) {
      const line = sections[i].trim();
      if (!line) break;

      Object.keys(distribution).forEach(key => {
        if (line.includes(key)) {
          distribution[key as keyof BloomsTaxonomy] = extractPercentage(line);
        }
      });
    }
  }

  return distribution;
}

function extractPercentage(text: string): number {
  const match = text.match(/(\d+(?:\.\d+)?)\s*%?/);
  return match ? parseFloat(match[1]) : 0;
}

function extractOverallAssessment(analysis: string): string {
  const sections = analysis.split('\n');
  const assessmentIndex = sections.findIndex(line => 
    line.toLowerCase().includes('overall assessment:')
  );

  if (assessmentIndex !== -1) {
    let assessment = '';
    for (let i = assessmentIndex + 1; i < sections.length; i++) {
      const line = sections[i].trim();
      if (!line || line.toLowerCase().includes('recommendations:')) break;
      assessment += (assessment ? ' ' : '') + line;
    }
    return assessment.trim();
  }
  return '';
}

function extractRecommendations(analysis: string): string[] {
  const recommendations: string[] = [];
  const sections = analysis.split('\n');
  const recommendationsIndex = sections.findIndex(line => 
    line.toLowerCase().includes('recommendations:')
  );

  if (recommendationsIndex !== -1) {
    for (let i = recommendationsIndex + 1; i < sections.length; i++) {
      const line = sections[i].trim();
      if (!line || line.toLowerCase().includes("bloom's taxonomy")) break;
      
      // Remove bullet points and numbers from the start of the line
      const cleanLine = line.replace(/^[•\-\*]\s*|\d+\.\s*/, '').trim();
      if (cleanLine) {
        recommendations.push(cleanLine);
      }
    }
  }

  return recommendations;
}

async function fetchTextFromUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const text = await response.text();
  return text;
}
