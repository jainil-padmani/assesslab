
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileCheck, AlertCircle } from "lucide-react";
import { StudentEvaluationRow } from "./StudentEvaluationRow";
import type { Student, Subject } from "@/types/dashboard";
import type { TestFile } from "@/hooks/useTestSelection";
import type { PaperEvaluation } from "@/hooks/useEvaluations";

interface StudentAnswerSheetsCardProps {
  selectedTest: string;
  selectedSubject: string;
  testFiles: TestFile[];
  classStudents: Student[];
  subjects: Subject[];
  evaluations: PaperEvaluation[];
  evaluatingStudents: string[];
  evaluationProgress: number;
  onEvaluateSingle: (studentId: string) => void;
  onEvaluateAll: () => void;
  onDeleteEvaluation?: (studentId: string) => void;
}

export function StudentAnswerSheetsCard({ 
  selectedTest,
  selectedSubject,
  testFiles,
  classStudents,
  subjects,
  evaluations,
  evaluatingStudents,
  evaluationProgress,
  onEvaluateSingle,
  onEvaluateAll,
  onDeleteEvaluation
}: StudentAnswerSheetsCardProps) {
  // Extract question papers and answer keys from test files
  const { questionPapers, answerKeys } = useMemo(() => {
    const questionPapers = testFiles.filter(file => file.question_paper_url);
    const answerKeys = testFiles.filter(file => file.answer_key_url);
    return { questionPapers, answerKeys };
  }, [testFiles]);

  // Find evaluation data for a specific student
  const getEvaluationData = (studentId: string) => {
    const evaluation = evaluations.find(e => e.student_id === studentId && e.status === 'completed');
    return evaluation?.evaluation_data;
  };

  // Check if a student is being evaluated
  const isStudentEvaluating = (studentId: string) => {
    return evaluatingStudents.includes(studentId);
  };

  // Get the status of a student's evaluation
  const getStudentStatus = (studentId: string) => {
    const evaluation = evaluations.find(e => e.student_id === studentId);
    return evaluation?.status || 'pending';
  };

  // Check if test files are available for evaluation
  const areTestFilesReady = questionPapers.length > 0 && answerKeys.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Student Answer Sheets</CardTitle>
            <CardDescription>Upload handwritten answer sheets for each student</CardDescription>
          </div>
          <Button 
            onClick={onEvaluateAll}
            disabled={evaluatingStudents.length > 0 || !areTestFilesReady}
          >
            <FileCheck className="mr-2 h-4 w-4" />
            Evaluate All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!areTestFilesReady && (
          <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mr-2" />
            <p className="text-sm text-amber-800 dark:text-amber-400">
              Both question paper and answer key are required for evaluation.
            </p>
          </div>
        )}
        
        {evaluatingStudents.length > 0 && (
          <div className="mb-6 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Evaluating papers... {evaluatingStudents.length} remaining</span>
              <span className="text-sm font-medium">{evaluationProgress}%</span>
            </div>
            <Progress value={evaluationProgress} className="h-2" />
          </div>
        )}
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>GR Number</TableHead>
              <TableHead>Answer Sheet</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classStudents.map((student) => (
              <StudentEvaluationRow
                key={student.id}
                student={student}
                status={getStudentStatus(student.id)}
                evaluationData={getEvaluationData(student.id)}
                isEvaluating={isStudentEvaluating(student.id)}
                selectedSubject={selectedSubject}
                selectedTest={selectedTest} 
                testFilesAvailable={areTestFilesReady}
                onEvaluate={onEvaluateSingle}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
