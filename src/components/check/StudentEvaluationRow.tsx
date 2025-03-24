
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileCheck, AlertCircle, FileX, Loader2 } from "lucide-react";
import { UploadAnswerSheet } from "./UploadAnswerSheet";
import { useState } from "react";
import { toast } from "sonner";
import type { Student } from "@/types/dashboard";
import { EvaluationStatus } from "@/types/assessments";

interface StudentEvaluationRowProps {
  student: Student;
  status: string;
  evaluationData: any;
  isEvaluating: boolean;
  selectedSubject: string;
  selectedTest: string;
  testFilesAvailable: boolean;
  onEvaluate: (studentId: string) => void;
}

export function StudentEvaluationRow({ 
  student, 
  status, 
  evaluationData,
  isEvaluating, 
  selectedSubject,
  selectedTest,
  testFilesAvailable,
  onEvaluate
}: StudentEvaluationRowProps) {
  // Function to render the status badge with appropriate color
  const renderStatusBadge = () => {
    if (status === EvaluationStatus.EVALUATED) {
      const score = evaluationData?.summary?.percentage || 0;
      
      return (
        <div className="flex items-center">
          <CheckCircle className="h-4 w-4 mr-2 text-green-600 dark:text-green-500" />
          <span>
            {evaluationData?.summary?.percentage}% (
            {evaluationData?.summary?.totalScore?.[0]}/
            {evaluationData?.summary?.totalScore?.[1]})
          </span>
        </div>
      );
    } else if (status === EvaluationStatus.IN_PROGRESS || isEvaluating) {
      return (
        <div className="flex items-center text-amber-600 dark:text-amber-500">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <span>Evaluating...</span>
        </div>
      );
    } else if (status === EvaluationStatus.FAILED) {
      return (
        <div className="flex items-center text-red-600 dark:text-red-500">
          <FileX className="h-4 w-4 mr-2" />
          <span>Failed</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-gray-500">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span>Not evaluated</span>
        </div>
      );
    }
  };

  return (
    <TableRow key={student.id}>
      <TableCell className="font-medium">{student.name}</TableCell>
      <TableCell>{student.gr_number}</TableCell>
      <TableCell>
        <UploadAnswerSheet 
          studentId={student.id}
          selectedSubject={selectedSubject}
          isEvaluating={isEvaluating}
          testId={selectedTest} 
        />
      </TableCell>
      <TableCell>
        {renderStatusBadge()}
      </TableCell>
      <TableCell>
        <div className="flex space-x-2">
          {(status !== EvaluationStatus.IN_PROGRESS && !isEvaluating) && (
            <Button 
              size="sm"
              variant={status === EvaluationStatus.FAILED ? "outline" : (status === EvaluationStatus.EVALUATED ? "secondary" : "outline")}
              onClick={() => onEvaluate(student.id)}
              disabled={isEvaluating || !testFilesAvailable}
              className={status === EvaluationStatus.FAILED ? "text-amber-600 border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950" : ""}
            >
              <FileCheck className="h-4 w-4 mr-2" />
              Evaluate
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
