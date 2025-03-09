
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Student } from "@/types/dashboard";
import type { PaperEvaluation } from "@/hooks/useEvaluations";

interface EvaluationResultsCardProps {
  evaluations: PaperEvaluation[];
  classStudents: Student[];
  selectedTest: string;
  onDelete?: (evaluationId: string, studentId: string) => void;
  refetchEvaluations: () => void;
}

export function EvaluationResultsCard({ 
  evaluations, 
  classStudents,
  selectedTest,
  onDelete,
  refetchEvaluations
}: EvaluationResultsCardProps) {
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  // Filter completed evaluations
  const completedEvaluations = evaluations.filter(e => 
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

  // Function to handle deleting an evaluation
  const handleDelete = async (evaluationId: string, studentId: string) => {
    try {
      setDeletingIds(prev => [...prev, evaluationId]);
      
      if (onDelete) {
        // Use provided onDelete handler
        await onDelete(evaluationId, studentId);
      } else {
        toast.error('Delete handler not provided');
      }
      
      // Refetch evaluations to update the UI
      refetchEvaluations();
    } catch (error) {
      console.error('Error deleting evaluation:', error);
      toast.error('Failed to delete evaluation');
    } finally {
      setDeletingIds(prev => prev.filter(id => id !== evaluationId));
    }
  };

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
                const isDeleting = deletingIds.includes(evaluation.id);
                
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
                      <div className="flex space-x-2">
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
                        
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(evaluation.id, evaluation.student_id)}
                          disabled={isDeleting}
                          className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          {isDeleting ? (
                            <span className="flex items-center">
                              <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
                              Deleting...
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </span>
                          )}
                        </Button>
                      </div>
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
