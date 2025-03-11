
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, AlertCircle, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import type { Student } from "@/types/dashboard";
import type { PaperEvaluation } from "@/hooks/useEvaluations";
import { toast } from "sonner";

interface EvaluationResultsCardProps {
  evaluations: PaperEvaluation[];
  classStudents: Student[];
  selectedTest: string;
  refetchEvaluations: () => void;
  onDeleteEvaluation: (evaluationId: string, studentId: string) => Promise<boolean>;
  onBatchDeleteEvaluations: (evaluations: { id: string, studentId: string }[]) => Promise<void>;
}

export function EvaluationResultsCard({ 
  evaluations, 
  classStudents,
  selectedTest,
  refetchEvaluations,
  onDeleteEvaluation,
  onBatchDeleteEvaluations
}: EvaluationResultsCardProps) {
  const [localEvaluations, setLocalEvaluations] = useState<PaperEvaluation[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedEvaluations, setSelectedEvaluations] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  
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

  const handleDelete = async (evaluation: PaperEvaluation) => {
    if (confirm(`Are you sure you want to delete evaluation for ${classStudents.find(s => s.id === evaluation.student_id)?.name || 'this student'}?`)) {
      setIsDeleting(evaluation.id);
      
      try {
        const success = await onDeleteEvaluation(evaluation.id, evaluation.student_id);
        
        if (success) {
          // Remove from local state
          setLocalEvaluations(prev => prev.filter(e => e.id !== evaluation.id));
          toast.success("Evaluation deleted successfully");
        } else {
          toast.error("Failed to delete evaluation");
        }
      } catch (error) {
        console.error("Error deleting evaluation:", error);
        toast.error("An error occurred while deleting evaluation");
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const handleSelectEvaluation = (evaluationId: string) => {
    setSelectedEvaluations(prev => {
      if (prev.includes(evaluationId)) {
        return prev.filter(id => id !== evaluationId);
      } else {
        return [...prev, evaluationId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedEvaluations.length === completedEvaluations.length) {
      setSelectedEvaluations([]);
    } else {
      setSelectedEvaluations(completedEvaluations.map(e => e.id));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedEvaluations.length === 0) {
      toast.info("No evaluations selected");
      return;
    }

    if (confirm(`Are you sure you want to delete ${selectedEvaluations.length} evaluation${selectedEvaluations.length > 1 ? 's' : ''}?`)) {
      setIsBatchDeleting(true);
      
      try {
        const evaluationsToDelete = selectedEvaluations.map(id => {
          const evaluation = completedEvaluations.find(e => e.id === id);
          return {
            id,
            studentId: evaluation?.student_id || ''
          };
        });
        
        await onBatchDeleteEvaluations(evaluationsToDelete);
        
        // Remove from local state
        setLocalEvaluations(prev => prev.filter(e => !selectedEvaluations.includes(e.id)));
        setSelectedEvaluations([]);
        
        toast.success("Selected evaluations deleted successfully");
      } catch (error) {
        console.error("Error in batch deletion:", error);
        toast.error("An error occurred during batch deletion");
      } finally {
        setIsBatchDeleting(false);
      }
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
          <>
            <div className="mb-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="select-all" 
                  checked={selectedEvaluations.length > 0 && selectedEvaluations.length === completedEvaluations.length} 
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all evaluations"
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Select all
                </label>
              </div>
              <Button
                variant="destructive"
                size="sm"
                disabled={selectedEvaluations.length === 0 || isBatchDeleting}
                onClick={handleBatchDelete}
                className="flex items-center"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedEvaluations.length})
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
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
                      <TableCell>
                        <Checkbox 
                          checked={selectedEvaluations.includes(evaluation.id)} 
                          onCheckedChange={() => handleSelectEvaluation(evaluation.id)}
                          aria-label={`Select ${student?.name || 'student'} evaluation`}
                        />
                      </TableCell>
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
                        <div className="flex items-center gap-2">
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
                            variant="destructive"
                            onClick={() => handleDelete(evaluation)}
                            disabled={isDeleting === evaluation.id || isBatchDeleting}
                            className="flex items-center"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
