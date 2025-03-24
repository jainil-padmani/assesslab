
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RefreshCw } from "lucide-react";

interface BloomsTaxonomyWeights {
  remember: number;
  understand: number;
  apply: number;
  analyze: number;
  evaluate: number;
  create: number;
}

interface QuestionParametersProps {
  difficulty: number;
  setDifficulty: (value: number) => void;
  bloomsTaxonomy: BloomsTaxonomyWeights;
  handleBloomsTaxonomyChange: (level: string, value: number[]) => void;
  generateQuestions: () => Promise<void>;
  isGenerating: boolean;
  isDisabled: boolean;
}

export function QuestionParameters({
  difficulty,
  setDifficulty,
  bloomsTaxonomy,
  handleBloomsTaxonomyChange,
  generateQuestions,
  isGenerating,
  isDisabled,
}: QuestionParametersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Question Parameters</CardTitle>
        <CardDescription>Configure question generation parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Difficulty Level: {difficulty}%</Label>
          <Slider
            value={[difficulty]}
            onValueChange={(value) => setDifficulty(value[0])}
            min={0}
            max={100}
            step={5}
            className="my-2"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Easy</span>
            <span>Moderate</span>
            <span>Hard</span>
          </div>
        </div>
        
        <div className="space-y-4">
          <Label>Bloom's Taxonomy Weights</Label>
          
          {Object.entries(bloomsTaxonomy).map(([level, value]) => (
            <div key={level} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="capitalize font-medium">{level}</span>
                <span className="text-sm">{value as number}%</span>
              </div>
              <Slider
                value={[value as number]}
                onValueChange={(val) => handleBloomsTaxonomyChange(level, val)}
                min={0}
                max={50}
                step={5}
                className="my-1"
              />
            </div>
          ))}
        </div>
        
        <Button 
          className="w-full" 
          onClick={generateQuestions}
          disabled={isDisabled || isGenerating}
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Questions'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
