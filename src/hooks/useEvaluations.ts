
import { useState } from "react";
import type { Student } from "@/types/dashboard";
import { useEvaluationData, type PaperEvaluation, type EvaluationStatus } from "./evaluation/useEvaluationData";
import { useEvaluationActions } from "./evaluation/useEvaluationActions";
import { useAnswerSheetData } from "./evaluation/useAnswerSheetData";
import { useEvaluationProcess } from "./evaluation/useEvaluationProcess";

export { type PaperEvaluation, type EvaluationStatus };

/**
 * Hook that composes all evaluation functionality
 */
export function useEvaluations(
  selectedTest: string, 
  selectedSubject: string,
  classStudents: Student[]
) {
  // Get evaluation data
  const { 
    evaluations, 
    refetchEvaluations 
  } = useEvaluationData(selectedTest);
  
  // Get evaluation actions
  const { deleteEvaluation } = useEvaluationActions(selectedTest);
  
  // Get answer sheet data operations
  const { 
    getStudentEvaluationStatus, 
    getStudentAnswerSheetUrl 
  } = useAnswerSheetData();
  
  // Get evaluation process
  const { 
    evaluatingStudents,
    setEvaluatingStudents,
    evaluationProgress,
    setEvaluationProgress,
    evaluationResults,
    setEvaluationResults,
    showResults,
    setShowResults,
    evaluatePaperMutation
  } = useEvaluationProcess(selectedTest, selectedSubject, refetchEvaluations);

  return {
    // Data
    evaluations,
    
    // Evaluation process state
    evaluatingStudents,
    setEvaluatingStudents,
    evaluationProgress,
    setEvaluationProgress,
    evaluationResults,
    setEvaluationResults,
    showResults,
    setShowResults,
    
    // Actions
    refetchEvaluations,
    evaluatePaperMutation,
    deleteEvaluation,
    
    // Utilities
    getStudentEvaluationStatus: (studentId: string) => 
      getStudentEvaluationStatus(evaluations, studentId),
    getStudentAnswerSheetUrl: (studentId: string) => 
      getStudentAnswerSheetUrl(studentId, selectedSubject, selectedTest)
  };
}
