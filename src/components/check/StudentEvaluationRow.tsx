
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileCheck, AlertCircle, FileX, Loader2, Trash2, RefreshCw } from "lucide-react";
import { UploadAnswerSheet } from "./UploadAnswerSheet";
import { useState } from "react";
import { toast } from "sonner";
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
  onDelete?: (studentId: string) => void;
}

export function StudentEvaluationRow({ 
  student, 
  status, 
  evaluationData,
  isEvaluating, 
  selectedSubject,
  testFilesAvailable,
  onEvaluate,
  onDelete
}: StudentEvaluationRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  // Function to render the status badge with appropriate color
  const renderStatusBadge = () => {
    if (status === 'completed') {
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

  // Function to handle deleting an evaluation
  const handleDelete = async () => {
    try {
      if (!onDelete) {
        toast.error('Delete handler not provided');
        return;
      }

      setIsDeleting(true);
      await onDelete(student.id);
      toast.success(`Deleted evaluation for ${student.name}`);
    } catch (error) {
      console.error('Error deleting evaluation:', error);
      toast.error('Failed to delete evaluation');
    } finally {
      setIsDeleting(false);
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
          {/* Always show Evaluate button, but with different styles based on status */}
          {(status !== 'in_progress' && !isEvaluating) && (
            <Button 
              size="sm"
              variant={status === 'failed' ? "outline" : (status === 'completed' ? "secondary" : "outline")}
              onClick={() => onEvaluate(student.id)}
              disabled={isEvaluating || !testFilesAvailable}
              className={status === 'failed' ? "text-amber-600 border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950" : ""}
            >
              {status === 'failed' ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </>
              ) : status === 'completed' ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-evaluate
                </>
              ) : (
                <>
                  <FileCheck className="mr-2 h-4 w-4" />
                  Evaluate
                </>
              )}
            </Button>
          )}
          
          {status === 'completed' && (
            <Button 
              size="sm"
              variant="outline"
              onClick={handleDelete}
              disabled={isEvaluating || isDeleting}
              className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
