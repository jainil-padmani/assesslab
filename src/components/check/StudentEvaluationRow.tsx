
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileCheck, AlertCircle, FileX } from "lucide-react";
import { UploadAnswerSheet } from "./UploadAnswerSheet";
import type { Student } from "@/types/dashboard";
import type { EvaluationStatus } from "@/hooks/useEvaluations";

interface StudentEvaluationRowProps {
  student: Student;
  status: EvaluationStatus;
  evaluationData: any;
  isEvaluating: boolean;
  selectedSubject: string;
  testFilesAvailable: boolean;
  onEvaluate: (studentId: string) => void;
}

export function StudentEvaluationRow({ 
  student, 
  status, 
  evaluationData,
  isEvaluating, 
  selectedSubject,
  testFilesAvailable,
  onEvaluate 
}: StudentEvaluationRowProps) {
  return (
    <TableRow key={student.id}>
      <TableCell className="font-medium">{student.name}</TableCell>
      <TableCell>{student.gr_number}</TableCell>
      <TableCell>
        <UploadAnswerSheet 
          studentId={student.id}
          selectedSubject={selectedSubject}
          isEvaluating={isEvaluating}
        />
      </TableCell>
      <TableCell>
        {status === 'completed' ? (
          <div className="flex items-center text-green-600">
            <CheckCircle className="h-4 w-4 mr-2" />
            <span>
              {evaluationData?.summary?.percentage}% (
              {evaluationData?.summary?.totalScore?.[0]}/
              {evaluationData?.summary?.totalScore?.[1]})
            </span>
          </div>
        ) : status === 'in_progress' || isEvaluating ? (
          <div className="flex items-center text-amber-600">
            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Evaluating...</span>
          </div>
        ) : status === 'failed' ? (
          <div className="flex items-center text-red-600">
            <FileX className="h-4 w-4 mr-2" />
            <span>Failed</span>
          </div>
        ) : (
          <div className="flex items-center text-gray-500">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>Not evaluated</span>
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="flex space-x-2">
          {(status !== 'completed' && status !== 'in_progress') && (
            <Button 
              size="sm"
              variant="outline"
              onClick={() => onEvaluate(student.id)}
              disabled={isEvaluating || !testFilesAvailable}
            >
              {isEvaluating ? (
                "Evaluating..."
              ) : (
                <>
                  <FileCheck className="mr-2 h-4 w-4" />
                  Evaluate
                </>
              )}
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
