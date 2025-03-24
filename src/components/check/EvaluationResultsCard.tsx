
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { PaperEvaluation } from '@/types/assessments';

interface EvaluationResultsCardProps {
  currentEvaluation: PaperEvaluation | null;
  onUpdateScore: (questionIndex: number, newScore: number) => void;
}

export default function EvaluationResultsCard({ 
  currentEvaluation,
  onUpdateScore 
}: EvaluationResultsCardProps) {
  if (!currentEvaluation || !currentEvaluation.evaluation_data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evaluation Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Select a student to view evaluation results
          </p>
        </CardContent>
      </Card>
    );
  }

  const { answers, summary } = currentEvaluation.evaluation_data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluation Results</CardTitle>
      </CardHeader>
      <CardContent>
        {summary && (
          <div className="mb-6 space-y-2">
            <div className="flex justify-between items-center">
              <span>Total Score:</span>
              <span className="font-medium">
                {summary.totalScore?.[0]}/{summary.totalScore?.[1]} ({summary.percentage}%)
              </span>
            </div>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Q#</TableHead>
              <TableHead>Question</TableHead>
              <TableHead>Student Answer</TableHead>
              <TableHead className="w-[120px] text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {answers?.map((answer, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>{answer.question}</TableCell>
                <TableCell>{answer.answer}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <Input
                      type="number"
                      min="0"
                      max={answer.score[1]}
                      value={answer.score[0]}
                      onChange={(e) => onUpdateScore(index, Number(e.target.value))}
                      className="w-16 text-right"
                    />
                    <span>/{answer.score[1]}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
