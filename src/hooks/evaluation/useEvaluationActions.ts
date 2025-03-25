
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PaperEvaluation } from "./useEvaluationData";

/**
 * Hook for managing evaluation actions like deletion
 */
export function useEvaluationActions(selectedTest: string) {
  const queryClient = useQueryClient();

  const deleteEvaluation = useCallback(async (evaluationId: string, studentId?: string) => {
    try {
      if (!selectedTest) {
        toast.error('No test selected');
        return false;
      }
      
      console.log(`Starting permanent deletion for evaluation ${evaluationId} and student ${studentId || 'unknown'}`);
      
      let targetEvaluationId = evaluationId;
      let targetStudentId = studentId;
      
      // If the evaluationId is actually a studentId, find the actual evaluation
      if (studentId && evaluationId === studentId) {
        const { data: evaluations } = await supabase
          .from('paper_evaluations')
          .select('id, student_id')
          .eq('student_id', studentId)
          .eq('test_id', selectedTest);
          
        if (evaluations && evaluations.length > 0) {
          targetEvaluationId = evaluations[0].id;
          targetStudentId = evaluations[0].student_id;
        } else {
          console.error("Evaluation not found for studentId:", studentId);
          return false;
        }
      }
      
      // Delete from paper_evaluations
      const { error: evalError } = await supabase
        .from('paper_evaluations')
        .delete()
        .eq('id', targetEvaluationId);
      
      if (evalError) {
        console.error("Error deleting paper evaluations:", evalError);
        throw evalError;
      }
      
      console.log("Successfully deleted from paper_evaluations table");
      
      // Delete from test_grades if we have a studentId
      if (targetStudentId) {
        const { error: gradeError } = await supabase
          .from('test_grades')
          .delete()
          .eq('student_id', targetStudentId)
          .eq('test_id', selectedTest);
        
        if (gradeError) {
          console.error('Error deleting test grade:', gradeError);
        } else {
          console.log("Successfully deleted from test_grades table");
        }
      }
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['evaluations', selectedTest] });
      queryClient.invalidateQueries({ queryKey: ['test-grades'] });
      queryClient.invalidateQueries({ queryKey: ['test-grades', selectedTest] });
      
      console.log("Successfully deleted evaluation:", targetEvaluationId);
      return true;
    } catch (error) {
      console.error('Error deleting evaluation:', error);
      return false;
    }
  }, [selectedTest, queryClient]);

  return {
    deleteEvaluation
  };
}
