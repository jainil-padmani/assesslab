
import { useState, useEffect } from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, FileText, Loader2, Upload } from "lucide-react";
import { UploadAnswerSheet } from "./UploadAnswerSheet";
import { Badge } from "@/components/ui/badge";
import { useUploadAssessment } from "@/hooks/useUploadAssessment";
import type { Student } from "@/types/dashboard";
import { toast } from "sonner";

interface StudentEvaluationRowProps {
  student: Student;
  status: string;
  evaluationData?: any;
  isEvaluating: boolean;
  selectedSubject: string;
  selectedTest: string;
  testFilesAvailable: boolean;
  onEvaluate: (studentId: string) => void;
  refreshTrigger: number;
}

export function StudentEvaluationRow({
  student,
  status,
  evaluationData,
  isEvaluating,
  selectedSubject,
  selectedTest,
  testFilesAvailable,
  onEvaluate,
  refreshTrigger
}: StudentEvaluationRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0);
  
  const {
    hasAnswerSheet,
    answerSheetUrl,
    openFileUpload,
    refetch: refreshAnswerSheet
  } = useUploadAssessment(student.id, selectedSubject, selectedTest, refreshTrigger + localRefreshTrigger);

  // Listen for answer sheet upload events
  useEffect(() => {
    const handleAnswerSheetUploaded = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.studentId === student.id) {
        console.log(`Answer sheet upload detected for student ${student.id}`);
        refreshAnswerSheet();
        setLocalRefreshTrigger(prev => prev + 1);
      }
    };
    
    document.addEventListener('answerSheetUploaded', handleAnswerSheetUploaded);
    
    return () => {
      document.removeEventListener('answerSheetUploaded', handleAnswerSheetUploaded);
    };
  }, [student.id, refreshAnswerSheet]);

  // Refresh the answer sheet data when the component mounts or refresh trigger changes
  useEffect(() => {
    refreshAnswerSheet();
  }, [refreshTrigger, refreshAnswerSheet]);

  // Determine if the evaluation button should be enabled
  const canEvaluate = hasAnswerSheet && testFilesAvailable && !isEvaluating && status !== 'completed';

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleEvaluate = () => {
    if (!testFilesAvailable) {
      toast.error("Cannot evaluate: Missing question paper or answer key");
      return;
    }
    
    if (!hasAnswerSheet) {
      toast.error("Cannot evaluate: Student has not uploaded an answer sheet");
      return;
    }
    
    onEvaluate(student.id);
  };

  const getStatusDisplay = () => {
    if (isEvaluating) {
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span className="text-blue-600 dark:text-blue-400">Evaluating...</span>
        </div>
      );
    }

    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Evaluated</Badge>;
      default:
        return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Pending</Badge>;
    }
  };

  return (
    <>
      <TableRow className={isExpanded ? "border-b-0" : ""}>
        <TableCell className="font-medium">
          {student.name}
        </TableCell>
        <TableCell>{student.roll_number || "N/A"}</TableCell>
        <TableCell>
          {hasAnswerSheet ? (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-600" />
              <span className="text-sm">Uploaded</span>
              {answerSheetUrl && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  asChild
                >
                  <a href={answerSheetUrl} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-blue-600 p-0 h-auto" 
              onClick={openFileUpload}
            >
              <Upload className="h-4 w-4 mr-1" />
              Upload
            </Button>
          )}
        </TableCell>
        <TableCell>{getStatusDisplay()}</TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            {status === 'completed' ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleExpand}
              >
                {isExpanded ? "Hide Details" : "View Results"}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEvaluate}
                disabled={!canEvaluate}
                className={canEvaluate ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" : ""}
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Evaluating...
                  </>
                ) : (
                  "Evaluate"
                )}
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
      
      {isExpanded && status === 'completed' && evaluationData && (
        <TableRow>
          <TableCell colSpan={5} className="bg-slate-50 dark:bg-slate-900/30 p-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Evaluation Results</h4>
              <pre className="text-xs overflow-auto p-4 bg-white dark:bg-slate-800 border rounded-md">
                {JSON.stringify(evaluationData, null, 2)}
              </pre>
            </div>
          </TableCell>
        </TableRow>
      )}
      
      {isExpanded && !hasAnswerSheet && (
        <TableRow>
          <TableCell colSpan={5} className="bg-slate-50 dark:bg-slate-900/30 p-4">
            <UploadAnswerSheet
              studentId={student.id}
              selectedSubject={selectedSubject}
              isEvaluating={isEvaluating}
              testId={selectedTest}
              onUploadComplete={refreshAnswerSheet}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
