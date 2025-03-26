
import { useMemo } from "react";
import { Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StudentEvaluationRow } from "./StudentEvaluationRow";
import type { Student } from "@/types/dashboard";
import type { TestFile } from "@/hooks/useTestSelection";
import type { PaperEvaluation } from "@/hooks/useEvaluations";

interface StudentsTableProps {
  filteredStudents: Student[];
  selectedTest: string;
  selectedSubject: string;
  testFiles: TestFile[];
  evaluations: PaperEvaluation[];
  evaluatingStudents: string[];
  onEvaluateSingle: (studentId: string) => void;
  refreshTrigger: number;
  onClearSearch: () => void;
}

export function StudentsTable({
  filteredStudents,
  selectedTest,
  selectedSubject,
  testFiles,
  evaluations,
  evaluatingStudents,
  onEvaluateSingle,
  refreshTrigger,
  onClearSearch
}: StudentsTableProps) {
  // Memoized check for question papers and answer keys
  const areTestFilesReady = useMemo(() => {
    console.log("Checking test files availability:", testFiles);
    const questionPapers = testFiles.filter(file => file.question_paper_url);
    const answerKeys = testFiles.filter(file => file.answer_key_url);
    const result = questionPapers.length > 0 && answerKeys.length > 0;
    console.log(`Test files ready: ${result} (${questionPapers.length} question papers, ${answerKeys.length} answer keys)`);
    return result;
  }, [testFiles]);

  const getEvaluationData = (studentId: string) => {
    const evaluation = evaluations.find(e => e.student_id === studentId && e.status === 'completed');
    return evaluation?.evaluation_data;
  };

  const isStudentEvaluating = (studentId: string) => {
    return evaluatingStudents.includes(studentId);
  };

  const getStudentStatus = (studentId: string) => {
    const evaluation = evaluations.find(e => e.student_id === studentId);
    return evaluation?.status || 'pending';
  };

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead>Student</TableHead>
            <TableHead>ID Number</TableHead>
            <TableHead>Answer Sheet</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
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
                refreshTrigger={refreshTrigger}
              />
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <Search className="h-8 w-8 mb-2 opacity-40" />
                  <p>No students match your search criteria</p>
                  <Button
                    variant="link"
                    onClick={onClearSearch}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
