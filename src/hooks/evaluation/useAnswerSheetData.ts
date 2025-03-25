
import { 
  getAnswerSheetUrl, 
  getAnswerSheetZipUrl 
} from "@/utils/assessment/fileUploadUtils";

/**
 * Hook for managing answer sheet data
 */
export function useAnswerSheetData() {
  /**
   * Get the evaluation status for a student
   */
  const getStudentEvaluationStatus = (
    evaluations: any[], 
    studentId: string
  ): 'pending' | 'in_progress' | 'completed' | 'failed' => {
    const evaluation = evaluations.find(e => e.student_id === studentId);
    return evaluation?.status || 'pending';
  };

  /**
   * Get the answer sheet URL for a student
   */
  const getStudentAnswerSheetUrl = async (
    studentId: string,
    subjectId: string,
    testId: string
  ): Promise<string | null> => {
    if (!subjectId || !testId) return null;
    return getAnswerSheetUrl(studentId, subjectId, testId);
  };

  /**
   * Get the zip URL containing all pages of an answer sheet
   */
  const getStudentAnswerSheetZipUrl = async (
    studentId: string,
    subjectId: string,
    testId: string
  ): Promise<string | null> => {
    if (!subjectId || !testId) return null;
    return getAnswerSheetZipUrl(studentId, subjectId, testId);
  };

  return {
    getStudentEvaluationStatus,
    getStudentAnswerSheetUrl,
    getStudentAnswerSheetZipUrl
  };
}
