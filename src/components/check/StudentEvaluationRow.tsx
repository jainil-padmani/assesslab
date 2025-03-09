
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileCheck, AlertCircle, FileX, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  // Function to render the status badge with appropriate color
  const renderStatusBadge = () => {
    if (status === 'completed') {
      const score = evaluationData?.summary?.percentage || 0;
      const colorClass = score >= 60 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 
                          score >= 40 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' : 
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      
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
    } else if (status === 'in_progress' || isEvaluating) {
      return (
        <div className="flex items-center text-amber-600 dark:text-amber-500">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <span>Evaluating...</span>
        </div>
      );
    } else if (status === 'failed') {
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
        />
      </TableCell>
      <TableCell>
        {renderStatusBadge()}
      </TableCell>
      <TableCell>
        <div className="flex space-x-2">
          {(status !== 'completed' && status !== 'in_progress' && !isEvaluating) && (
            <Button 
              size="sm"
              variant="outline"
              onClick={() => onEvaluate(student.id)}
              disabled={isEvaluating || !testFilesAvailable}
            >
              <FileCheck className="mr-2 h-4 w-4" />
              Evaluate
            </Button>
          )}
          
          {status === 'failed' && (
            <Button 
              size="sm"
              variant="outline"
              onClick={() => onEvaluate(student.id)}
              disabled={isEvaluating || !testFilesAvailable}
              className="text-amber-600 border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
            >
              <FileCheck className="mr-2 h-4 w-4" />
              Retry
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
