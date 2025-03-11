
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import type { Student } from "@/types/dashboard";
import type { PaperEvaluation } from "@/hooks/useEvaluations";

interface EvaluationResultsCardProps {
  evaluations: PaperEvaluation[];
  classStudents: Student[];
  selectedTest: string;
  refetchEvaluations: () => void;
}

export function EvaluationResultsCard({ 
  evaluations, 
  classStudents,
  selectedTest,
  refetchEvaluations
}: EvaluationResultsCardProps) {
  const [localEvaluations, setLocalEvaluations] = useState<PaperEvaluation[]>([]);
  
  // Initialize and update local evaluations when props change
  useEffect(() => {
    setLocalEvaluations(evaluations.filter(e => e.status === 'completed'));
  }, [evaluations]);

  // Filter completed evaluations
  const completedEvaluations = localEvaluations.filter(e => 
    e.status === 'completed' && 
    e.evaluation_data?.answers && 
    e.evaluation_data?.summary?.totalScore
  );

  // Calculate average score if available
  const averageScore = (() => {
    if (completedEvaluations.length === 0) return null;
    
    let totalPercentage = 0;
    completedEvaluations.forEach(e => {
      totalPercentage += e.evaluation_data.summary.percentage;
    });
    
    return Math.round(totalPercentage / completedEvaluations.length);
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluation Results</CardTitle>
        <CardDescription>
          View evaluation results for all students
          {averageScore !== null && (
            <span className="ml-2 text-sm font-medium">
              (Class Average: {averageScore}%)
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {completedEvaluations.length === 0 ? (
          <div className="p-4 border rounded-md flex items-center justify-center text-muted-foreground">
            <AlertCircle className="h-4 w-4 mr-2" />
            No completed evaluations available
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedEvaluations.map((evaluation) => {
                const student = classStudents.find(s => s.id === evaluation.student_id);
                const data = evaluation.evaluation_data;
                
                return (
                  <TableRow key={evaluation.id}>
                    <TableCell className="font-medium">{student?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      {data?.summary?.totalScore ? (
                        <div>
                          <span className={`font-medium ${data.summary.percentage >= 60 ? 'text-green-600 dark:text-green-500' : data.summary.percentage >= 40 ? 'text-amber-600 dark:text-amber-500' : 'text-red-600 dark:text-red-500'}`}>
                            {data.summary.percentage}%
                          </span>
                          <span className="text-muted-foreground ml-2">
                            ({data.summary.totalScore[0]}/{data.summary.totalScore[1]})
                          </span>
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline"
                        asChild
                      >
                        <a href={`/dashboard/tests/detail/${selectedTest}?student=${evaluation.student_id}`} className="flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          View Details
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
