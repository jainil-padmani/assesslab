
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
    const { action, content, subjectId, expectedBloomsTaxonomy } = await req.json();

    if (action === 'analyze_paper') {
      // Extract text from the uploaded file or use provided text
      const textToAnalyze = content.text || await fetchTextFromUrl(content.fileUrl);

      console.log("Analyzing text:", textToAnalyze);

      // Analyze the text using GPT-4
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
              content: `You are an expert in educational assessment and Bloom's Taxonomy. Analyze the given questions and provide a detailed response in the following format:

Bloom's Taxonomy Distribution:
- Remember: X%
- Understand: X%
- Apply: X%
- Analyze: X%
- Evaluate: X%
- Create: X%

Topics Covered:
- Topic 1: N questions
- Topic 2: N questions
[List all topics with their question counts]

Difficulty Distribution:
- Easy: X%
- Medium: X%
- Hard: X%
- Advanced: X%

Overall Assessment:
[Provide a detailed assessment of the question paper's quality, balance, and effectiveness]

Recommendations:
- [Specific recommendation 1]
- [Specific recommendation 2]
[List actionable recommendations for improvement]`
            },
            {
              role: 'user',
              content: `Analyze these questions thoroughly and provide a complete analysis following the exact format specified:

${textToAnalyze}

Expected Bloom's Taxonomy distribution for reference: ${JSON.stringify(expectedBloomsTaxonomy)}`
            }
          ],
        }),
      });

      const analysisData = await analysisResponse.json();
      const analysis = analysisData.choices[0].message.content;

      console.log("AI Response:", analysis);

      // Parse the analysis to extract structured data
      const bloomsDistribution = extractBloomsDistribution(analysis);
      const topicsCovered = extractTopics(analysis);
      const difficultyDistribution = extractDifficulty(analysis);
      const overallAssessment = extractOverallAssessment(analysis);
      const recommendations = extractRecommendations(analysis);

      const result = {
        bloomsTaxonomy: bloomsDistribution,
        topics: topicsCovered,
        difficulty: difficultyDistribution,
        overallAssessment,
        recommendations,
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

// Helper functions
async function fetchTextFromUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const text = await response.text();
  return text;
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
  const bloomsSection = sections.findIndex(line => 
    line.includes("bloom's taxonomy distribution:") || 
    line.includes("blooms taxonomy distribution:")
  );

  if (bloomsSection !== -1) {
    for (let i = bloomsSection + 1; i < sections.length; i++) {
      const line = sections[i].trim();
      if (!line || line.includes('topics covered:')) break;

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

function extractTopics(analysis: string): Array<{ name: string; questionCount: number }> {
  const topics: Array<{ name: string; questionCount: number }> = [];
  const sections = analysis.split('\n');
  const topicsIndex = sections.findIndex(line => 
    line.toLowerCase().includes('topics covered:')
  );

  if (topicsIndex !== -1) {
    for (let i = topicsIndex + 1; i < sections.length; i++) {
      const line = sections[i].trim();
      if (!line || line.toLowerCase().includes('difficulty distribution:')) break;

      const match = line.match(/^[•\-\*]?\s*([^:]+):\s*(\d+)/);
      if (match) {
        const name = match[1].trim();
        const count = parseInt(match[2]);
        if (name && !isNaN(count)) {
          topics.push({ name, questionCount: count });
        }
      }
    }
  }

  return topics;
}

function extractDifficulty(analysis: string): Array<{ name: string; value: number }> {
  const difficulties: Array<{ name: string; value: number }> = [];
  const sections = analysis.split('\n');
  const difficultyIndex = sections.findIndex(line => 
    line.toLowerCase().includes('difficulty distribution:')
  );

  if (difficultyIndex !== -1) {
    const difficultyLevels = ['Easy', 'Medium', 'Hard', 'Advanced'];
    
    for (let i = difficultyIndex + 1; i < sections.length; i++) {
      const line = sections[i].trim();
      if (!line || line.toLowerCase().includes('overall assessment:')) break;

      difficultyLevels.forEach(level => {
        if (line.toLowerCase().includes(level.toLowerCase())) {
          const value = extractPercentage(line);
          if (value > 0) {
            difficulties.push({ name: level, value });
          }
        }
      });
    }
  }

  return difficulties;
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
      if (!line) break;
      
      // Remove bullet points and numbers from the start of the line
      const cleanLine = line.replace(/^[•\-\*]\s*|\d+\.\s*/, '').trim();
      if (cleanLine) {
        recommendations.push(cleanLine);
      }
    }
  }

  return recommendations;
}
