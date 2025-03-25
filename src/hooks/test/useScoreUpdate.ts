
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TestGrade } from "@/types/tests";
import type { PaperEvaluation } from "../evaluation/useEvaluationData";

/**
 * Hook for updating answer scores in evaluations
 */
export function useScoreUpdate() {
  const handleUpdateAnswerScore = async (
    grade: any, 
    questionIndex: number, 
    newScore: number
  ) => {
    try {
      if (!grade.evaluation) {
        toast.error("No evaluation data found for this student");
        return;
      }
      
      // Get the evaluation data
      const evaluationData = grade.evaluation.evaluation_data;
      if (!evaluationData || !evaluationData.answers || !Array.isArray(evaluationData.answers)) {
        toast.error("Invalid evaluation data");
        return;
      }
      
      // Update the score for the specific question
      const updatedAnswers = [...evaluationData.answers];
      if (updatedAnswers[questionIndex] && Array.isArray(updatedAnswers[questionIndex].score)) {
        // Update the score
        updatedAnswers[questionIndex].score[0] = newScore;
        
        // Recalculate total score
        let totalAssignedScore = 0;
        let totalPossibleScore = 0;
        
        updatedAnswers.forEach(answer => {
          if (Array.isArray(answer.score) && answer.score.length === 2) {
            totalAssignedScore += Number(answer.score[0]);
            totalPossibleScore += Number(answer.score[1]);
          }
        });
        
        // Update the summary
        const updatedEvaluationData = {
          ...evaluationData,
          answers: updatedAnswers,
          summary: {
            ...evaluationData.summary,
            totalScore: [totalAssignedScore, totalPossibleScore],
            percentage: totalPossibleScore > 0 ? Math.round((totalAssignedScore / totalPossibleScore) * 100) : 0
          }
        };
        
        // Save to database
        const { error: evalError } = await supabase
          .from("paper_evaluations")
          .update({
            evaluation_data: updatedEvaluationData,
            updated_at: new Date().toISOString()
          })
          .eq("id", grade.evaluation.id);
        
        if (evalError) throw evalError;
        
        // Update the test grade
        const { error: gradeError } = await supabase
          .from("test_grades")
          .upsert({
            test_id: grade.test_id,
            student_id: grade.student_id,
            marks: totalAssignedScore,
            remarks: `Updated manually: ${totalAssignedScore}/${totalPossibleScore}`
          });
        
        if (gradeError) throw gradeError;
        
        toast.success("Score updated successfully");
        return true;
      } else {
        toast.error("Failed to update score: Invalid score format");
        return false;
      }
    } catch (error: any) {
      toast.error(`Failed to update score: ${error.message}`);
      console.error("Error updating score:", error);
      return false;
    }
  };

  return {
    handleUpdateAnswerScore
  };
}
