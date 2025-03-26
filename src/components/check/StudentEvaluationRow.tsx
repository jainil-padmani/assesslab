
import React, { useState, useEffect } from 'react';
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Check, AlertCircle, File, Loader2, Eye } from "lucide-react";
import { useUploadAssessment } from "@/hooks/useUploadAssessment";
import { UploadAnswerSheet } from "./UploadAnswerSheet";
import { Badge } from "@/components/ui/badge";
import type { Student } from "@/types/dashboard";
import { EvaluationStatus } from "@/types/assessments";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StudentEvaluationRowProps {
  student: Student;
  status: string;
  evaluationData?: any;
  isEvaluating: boolean;
  selectedSubject: string;
  selectedTest: string;
  testFilesAvailable: boolean;
  onEvaluate: (studentId: string) => void;
  refreshTrigger?: number;
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
  refreshTrigger = 0
}: StudentEvaluationRowProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Force refresh when parent triggers it or when a file is uploaded
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [refreshTrigger]);
  
  const { 
    hasAnswerSheet, 
    answerSheetUrl,
    refetch
  } = useUploadAssessment(student.id, selectedSubject, selectedTest, refreshKey);

  // Set up event listener for answer sheet uploads
  useEffect(() => {
    const handleAnswerSheetUploaded = (event: CustomEvent) => {
      if (event.detail.studentId === student.id) {
        console.log(`Answer sheet uploaded for student ${student.id}, refreshing data`);
        refetch();
      }
    };
    
    document.addEventListener('answerSheetUploaded', handleAnswerSheetUploaded as EventListener);
    
    return () => {
      document.removeEventListener('answerSheetUploaded', handleAnswerSheetUploaded as EventListener);
    };
  }, [student.id, refetch]);

  const handleUploadComplete = () => {
    // Refresh the upload assessment data
    refetch();
    // Force UI refresh
    setRefreshKey(prev => prev + 1);
  };

  const renderStatus = () => {
    switch(status) {
      case EvaluationStatus.COMPLETED:
        return (
          <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-100 font-medium">
            <Check className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case EvaluationStatus.IN_PROGRESS:
        return (
          <Badge variant="warning" className="bg-amber-100 text-amber-800 hover:bg-amber-100 font-medium">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            In Progress
          </Badge>
        );
      case EvaluationStatus.FAILED:
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 font-medium">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100 font-medium">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <TableRow className="hover:bg-muted/40 transition-colors">
      <TableCell className="font-medium">
        <div className="flex items-center space-x-2">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium">{student.name}</p>
            <p className="text-xs text-muted-foreground">{student.email || "No email"}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-sm font-medium">
          {student.roll_number || '-'}
        </span>
      </TableCell>
      <TableCell>
        {hasAnswerSheet ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-slate-200 hover:bg-slate-100"
                  asChild
                >
                  <a href={answerSheetUrl || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center">
                    <File className="h-4 w-4 mr-2 text-blue-600" />
                    View Sheet
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View student answer sheet</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="max-w-60">
            <UploadAnswerSheet 
              studentId={student.id} 
              selectedSubject={selectedSubject} 
              testId={selectedTest}
              isEvaluating={isEvaluating}
              onUploadComplete={handleUploadComplete}
            />
          </div>
        )}
      </TableCell>
      <TableCell>
        {renderStatus()}
      </TableCell>
      <TableCell className="text-right">
        <Button 
          variant={hasAnswerSheet ? "default" : "outline"}
          size="sm"
          onClick={() => onEvaluate(student.id)}
          disabled={isEvaluating || !hasAnswerSheet || !testFilesAvailable}
          className={`${hasAnswerSheet ? "bg-primary hover:bg-primary/90" : "border-slate-200"} rounded-md transition-all duration-200 focus:ring-2 focus:ring-primary/30`}
        >
          {isEvaluating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Evaluating...
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Evaluate
            </>
          )}
        </Button>
      </TableCell>
    </TableRow>
  );
}
