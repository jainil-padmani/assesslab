
import { useTestData } from "./test/useTestData";
import { useTestGrades } from "./test/useTestGrades";
import { useGradeManagement } from "./test/useGradeManagement";
import { useScoreUpdate } from "./test/useScoreUpdate";
import type { PaperEvaluation } from "./evaluation/useEvaluationData";

export type { PaperEvaluation };

export function useTestDetail(testId: string | undefined) {
  // Get test data
  const { test, isTestLoading, refetchTest } = useTestData(testId);
  
  // Get test grades
  const { grades, isGradesLoading, refetchGrades } = useTestGrades(testId, test);
  
  // Get grade management functions
  const { 
    editingStudentId, 
    setEditingStudentId, 
    editMarks, 
    setEditMarks, 
    handleSaveMarks 
  } = useGradeManagement();
  
  // Get score update functions
  const { handleUpdateAnswerScore } = useScoreUpdate();

  const refetchAll = () => {
    refetchTest?.();
    refetchGrades();
  };

  return {
    test,
    grades,
    isLoading: isTestLoading || isGradesLoading,
    editingStudentId,
    setEditingStudentId,
    editMarks,
    setEditMarks,
    handleSaveMarks: (grade: any) => handleSaveMarks(grade, refetchGrades),
    handleUpdateAnswerScore,
    refetch: refetchAll
  };
}
