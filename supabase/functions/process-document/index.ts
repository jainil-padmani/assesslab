
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
              content: `You are an expert in educational assessment and Bloom's Taxonomy. Analyze the given questions and:
              1. Identify the Bloom's Taxonomy level for each question
              2. Calculate the percentage distribution across taxonomy levels
              3. Identify topics covered and their difficulty levels
              4. Provide recommendations based on the expected distribution`
            },
            {
              role: 'user',
              content: `Analyze these questions and provide:
              1. Bloom's Taxonomy distribution (in percentages)
              2. Topics covered with question counts
              3. Difficulty distribution
              4. Overall assessment
              5. Comparison with expected distribution: ${JSON.stringify(expectedBloomsTaxonomy)}
              
              Questions:
              ${textToAnalyze}`
            }
          ],
        }),
      });

      const analysisData = await analysisResponse.json();
      const analysis = analysisData.choices[0].message.content;

      // Parse the analysis to extract structured data
      const bloomsDistribution = extractBloomsDistribution(analysis);
      const topicsCovered = extractTopics(analysis);
      const difficultyDistribution = extractDifficulty(analysis);
      const overallAssessment = extractOverallAssessment(analysis);
      const recommendations = extractRecommendations(analysis);

      return new Response(
        JSON.stringify({
          bloomsTaxonomy: bloomsDistribution,
          topics: topicsCovered,
          difficulty: difficultyDistribution,
          overallAssessment,
          recommendations,
        }),
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
  // Extract Bloom's taxonomy percentages from the analysis
  // This is a simplified version - you'll need to implement proper parsing
  const distribution = {
    remember: 0,
    understand: 0,
    apply: 0,
    analyze: 0,
    evaluate: 0,
    create: 0
  };

  // Parse the analysis text to find percentage values
  // You might want to use regex or other parsing methods
  const lines = analysis.split('\n');
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('remember')) {
      distribution.remember = extractPercentage(line);
    } else if (lower.includes('understand')) {
      distribution.understand = extractPercentage(line);
    } else if (lower.includes('apply')) {
      distribution.apply = extractPercentage(line);
    } else if (lower.includes('analyze')) {
      distribution.analyze = extractPercentage(line);
    } else if (lower.includes('evaluate')) {
      distribution.evaluate = extractPercentage(line);
    } else if (lower.includes('create')) {
      distribution.create = extractPercentage(line);
    }
  }

  return distribution;
}

function extractPercentage(text: string): number {
  const match = text.match(/(\d+(\.\d+)?)\s*%/);
  return match ? parseFloat(match[1]) : 0;
}

function extractTopics(analysis: string): Array<{ name: string; questionCount: number }> {
  // Extract topics and their question counts
  // Implement proper parsing based on the AI response format
  const topics: Array<{ name: string; questionCount: number }> = [];
  const topicsSection = analysis.split('Topics covered:')[1]?.split('\n') || [];
  
  for (const line of topicsSection) {
    const match = line.match(/(.*?)\s*:\s*(\d+)/);
    if (match) {
      topics.push({
        name: match[1].trim(),
        questionCount: parseInt(match[2])
      });
    }
  }

  return topics;
}

function extractDifficulty(analysis: string): Array<{ name: string; value: number }> {
  // Extract difficulty distribution
  // Implement proper parsing based on the AI response format
  const difficulties: Array<{ name: string; value: number }> = [];
  const difficultySection = analysis.split('Difficulty distribution:')[1]?.split('\n') || [];
  
  for (const line of difficultySection) {
    const match = line.match(/(Easy|Medium|Hard|Advanced):\s*(\d+(\.\d+)?)\s*%/);
    if (match) {
      difficulties.push({
        name: match[1],
        value: parseFloat(match[2])
      });
    }
  }

  return difficulties;
}

function extractOverallAssessment(analysis: string): string {
  // Extract the overall assessment section
  const assessmentMatch = analysis.match(/Overall assessment:(.*?)(?=\n\n|\n[A-Z]|$)/s);
  return assessmentMatch ? assessmentMatch[1].trim() : '';
}

function extractRecommendations(analysis: string): string[] {
  // Extract recommendations
  const recommendationsSection = analysis.split('Recommendations:')[1] || '';
  return recommendationsSection
    .split('\n')
    .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
    .map(line => line.replace(/^[-•]\s*/, '').trim());
}
