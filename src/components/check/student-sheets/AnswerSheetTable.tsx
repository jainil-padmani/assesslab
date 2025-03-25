
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { StudentEvaluationRow } from "../StudentEvaluationRow";
import type { Student } from "@/types/dashboard";
import type { PaperEvaluation } from "@/hooks/useEvaluations";

interface AnswerSheetTableProps {
  filteredStudents: Student[];
  selectedSubject: string;
  selectedTest: string;
  areTestFilesReady: boolean;
  evaluations: PaperEvaluation[];
  evaluatingStudents: string[];
  onEvaluateSingle: (studentId: string) => void;
  refreshTrigger: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function AnswerSheetTable({
  filteredStudents,
  selectedSubject,
  selectedTest,
  areTestFilesReady,
  evaluations,
  evaluatingStudents,
  onEvaluateSingle,
  refreshTrigger,
  searchQuery,
  setSearchQuery
}: AnswerSheetTableProps) {
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
                    onClick={() => setSearchQuery("")}
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
