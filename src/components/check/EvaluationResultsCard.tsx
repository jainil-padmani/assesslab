
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { Student } from "@/types/dashboard";
import type { PaperEvaluation } from "@/hooks/useEvaluations";

interface EvaluationResultsCardProps {
  evaluations: PaperEvaluation[];
  classStudents: Student[];
  selectedTest: string;
}

export function EvaluationResultsCard({ 
  evaluations, 
  classStudents,
  selectedTest
}: EvaluationResultsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluation Results</CardTitle>
        <CardDescription>
          View evaluation results for all students
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evaluations
              .filter(e => e.status === 'completed' && e.evaluation_data?.answers)
              .map((evaluation) => {
                const student = classStudents.find(s => s.id === evaluation.student_id);
                const data = evaluation.evaluation_data;
                return (
                  <TableRow key={evaluation.id}>
                    <TableCell className="font-medium">{student?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      {data?.summary?.totalScore ? (
                        <div>
                          <span className="font-medium">{data.summary.percentage}%</span>
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
                        <a href={`/dashboard/tests/detail/${selectedTest}?student=${evaluation.student_id}`}>
                          View Details
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
