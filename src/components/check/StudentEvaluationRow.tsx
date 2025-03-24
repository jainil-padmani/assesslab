
import React from 'react';
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Upload, Check, AlertCircle, File, Loader2 } from "lucide-react";
import { useUploadAssessment } from "@/hooks/useUploadAssessment";
import { UploadAnswerSheet } from "./UploadAnswerSheet";
import { Badge } from "@/components/ui/badge";
import type { Student } from "@/types/dashboard";
import { EvaluationStatus } from "@/types/assessments";

interface StudentEvaluationRowProps {
  student: Student;
  status: string;
  evaluationData?: any;
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
  const { 
    isUploading, 
    hasAnswerSheet, 
    answerSheetUrl, 
    openFileUpload
  } = useUploadAssessment(student.id, selectedSubject, selectedTest);

  const renderStatus = () => {
    switch(status) {
      case EvaluationStatus.COMPLETED:
        return (
          <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-100">
            <Check className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case EvaluationStatus.IN_PROGRESS:
        return (
          <Badge variant="warning" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            In Progress
          </Badge>
        );
      case EvaluationStatus.FAILED:
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{student.name}</TableCell>
      <TableCell>{student.roll_number || '-'}</TableCell>
      <TableCell>
        {hasAnswerSheet ? (
          <Button 
            variant="outline" 
            size="sm" 
            asChild
          >
            <a href={answerSheetUrl || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center">
              <File className="h-4 w-4 mr-2" />
              View Sheet
            </a>
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={openFileUpload}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        )}
        <UploadAnswerSheet 
          studentId={student.id} 
          selectedSubject={selectedSubject} 
          testId={selectedTest}
          isEvaluating={isEvaluating}
        />
      </TableCell>
      <TableCell>
        {renderStatus()}
      </TableCell>
      <TableCell className="text-right">
        <Button 
          variant="default" 
          size="sm"
          onClick={() => onEvaluate(student.id)}
          disabled={isEvaluating || !hasAnswerSheet || !testFilesAvailable}
          className="w-full md:w-auto"
        >
          {isEvaluating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Evaluating...
            </>
          ) : (
            'Evaluate'
          )}
        </Button>
      </TableCell>
    </TableRow>
  );
}
