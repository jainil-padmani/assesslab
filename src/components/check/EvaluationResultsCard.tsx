import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EvaluationStatus, PaperEvaluation } from '@/types/assessments';

interface EvaluationResultsCardProps {
  currentEvaluation: PaperEvaluation | null;
  onUpdateScore: (questionIndex: number, newScore: number) => void;
}

const EvaluationResultsCard: React.FC<EvaluationResultsCardProps> = ({ 
  currentEvaluation,
  onUpdateScore
}) => {
  if (!currentEvaluation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evaluation Results</CardTitle>
          <CardDescription>Select a student to view evaluation results</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Extract evaluation data
  const evaluationData = currentEvaluation.evaluation_data;
  
  // Check if evaluation has been completed
  const isEvaluated = currentEvaluation.status === EvaluationStatus.EVALUATED;

  if (!evaluationData || !evaluationData.answers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evaluation Results</CardTitle>
          <CardDescription>No evaluation data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluation Results</CardTitle>
        <CardDescription>
          {isEvaluated ? 'Evaluation completed' : 'Evaluation in progress'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {evaluationData.answers.map((answer: any, index: number) => (
          <div key={index} className="border rounded-md p-4">
            <h4 className="text-sm font-medium">Question {index + 1}</h4>
            <p className="text-muted-foreground">
              Confidence Score: {answer.score ? answer.score[0] : 'N/A'} / {answer.score ? answer.score[1] : 'N/A'}
            </p>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onUpdateScore(index, Math.max(0, (answer.score ? answer.score[0] : 0) - 1))}
              >
                Decrease Score
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onUpdateScore(index, Math.min(answer.score ? answer.score[1] : 100, (answer.score ? answer.score[0] : 0) + 1))}
              >
                Increase Score
              </Button>
            </div>
          </div>
        ))}
        <div className="border rounded-md p-4">
          <h4 className="text-sm font-medium">Summary</h4>
          <p className="text-muted-foreground">
            Total Score: {evaluationData.summary?.totalScore?.[0]} / {evaluationData.summary?.totalScore?.[1]}
          </p>
          <p className="text-muted-foreground">
            Percentage: {evaluationData.summary?.percentage}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EvaluationResultsCard;
