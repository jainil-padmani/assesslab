
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileCheck } from "lucide-react";
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
  onEvaluateAll
}: StudentAnswerSheetsCardProps) {
  // Extract question papers and answer keys from test files
  const { questionPapers, answerKeys } = useMemo(() => {
    const questionPapers = testFiles.filter(file => file.question_paper_url);
    const answerKeys = testFiles.filter(file => file.answer_key_url);
    return { questionPapers, answerKeys };
  }, [testFiles]);

  // Find evaluation data for a specific student
  const getEvaluationData = (studentId: string) => {
    const evaluation = evaluations.find(e => e.student_id === studentId);
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
            disabled={evaluatingStudents.length > 0 || testFiles.length === 0}
          >
            <FileCheck className="mr-2 h-4 w-4" />
            Evaluate All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {evaluatingStudents.length > 0 && (
          <div className="mb-6 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Evaluating papers...</span>
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
                testFilesAvailable={testFiles.length > 0}
                onEvaluate={onEvaluateSingle}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
