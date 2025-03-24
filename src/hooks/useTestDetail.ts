import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Test, TestGrade } from "@/types/tests";
import type { Student } from "@/types/dashboard";

export interface PaperEvaluation {
  id: string;
  test_id: string;
  student_id: string;
  subject_id: string;
  evaluation_data: any;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useTestDetail(testId: string | undefined) {
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editMarks, setEditMarks] = useState<number>(0);

  const { data: test, isLoading: isTestLoading } = useQuery({
    queryKey: ["test", testId],
    queryFn: async () => {
      if (!testId) return null;
      
      const { data, error } = await supabase
        .from("tests")
        .select("*, subjects!inner(*)")
        .eq("id", testId)
        .single();
      
      if (error) {
        toast.error("Failed to load test details");
        throw error;
      }
      
      return data as Test & { subjects: { name: string, subject_code: string } };
    },
    enabled: !!testId
  });

  const { data: grades, isLoading: isGradesLoading, refetch } = useQuery({
    queryKey: ["testGrades", testId],
    queryFn: async () => {
      if (!testId || !test) return [];
      
      // Get all students in this class
      const { data: classStudents, error: classError } = await supabase
        .from("students")
        .select("*")
        .eq("class_id", test?.class_id || "");
      
      if (classError) {
        toast.error("Failed to load students in this class");
        throw classError;
      }
      
      // Get existing grades for this test
      const { data: existingGrades, error: gradesError } = await supabase
        .from("test_grades")
        .select("*")
        .eq("test_id", testId);
      
      if (gradesError) {
        toast.error("Failed to load test grades");
        throw gradesError;
      }

      // Get assessments (uploaded answer sheets) for students in this test
      const { data: assessments, error: assessmentsError } = await supabase
        .from('assessments_master')
        .select('*')
        .eq('subject_id', test.subject_id)
        .eq('test_id', testId); // This ensures we get test-specific answer sheets
        
      if (assessmentsError) {
        toast.error("Failed to load assessments");
        throw assessmentsError;
      }
      
      // Get evaluation data for this test
      const { data: evaluations, error: evaluationsError } = await supabase
        .from("paper_evaluations")
        .select("*")
        .eq("test_id", testId);
        
      if (evaluationsError) {
        console.error("Failed to load evaluations:", evaluationsError);
      }
      
      // Map grades to students or create empty grades
      const studentGrades = (classStudents as Student[]).map(student => {
        const existingGrade = (existingGrades as TestGrade[]).find(
          grade => grade.student_id === student.id
        );
        
        // Find assessment for this student if it exists
        const studentAssessment = assessments 
          ? assessments.find(assessment => 
              assessment && 
              typeof assessment === 'object' && 
              'student_id' in assessment && 
              assessment.student_id === student.id
            ) 
          : null;
        
        // Find evaluation for this student if it exists
        const studentEvaluation = evaluations ? evaluations.find(
          evaluation => evaluation.student_id === student.id
        ) : null;
        
        if (existingGrade) {
          return {
            ...existingGrade,
            student,
            answer_sheet_url: studentAssessment && 
              typeof studentAssessment === 'object' && 
              'answer_sheet_url' in studentAssessment 
                ? studentAssessment.answer_sheet_url 
                : null,
            evaluation: studentEvaluation
          };
        } else {
          return {
            id: `temp-${student.id}`,
            test_id: testId!,
            student_id: student.id,
            marks: 0,
            remarks: null,
            created_at: new Date().toISOString(),
            student,
            answer_sheet_url: studentAssessment && 
              typeof studentAssessment === 'object' && 
              'answer_sheet_url' in studentAssessment 
                ? studentAssessment.answer_sheet_url 
                : null,
            evaluation: studentEvaluation
          } as TestGrade & { 
            answer_sheet_url: string | null;
            evaluation: PaperEvaluation | null;
          };
        }
      });
      
      return studentGrades;
    },
    enabled: !!testId && !!test
  });

  const handleSaveMarks = async (grade: TestGrade) => {
    try {
      // Check if this is a temp id (new grade)
      const isNewGrade = grade.id.startsWith('temp-');
      
      if (isNewGrade) {
        // Create a new grade
        const { data, error } = await supabase
          .from("test_grades")
          .insert({
            test_id: grade.test_id,
            student_id: grade.student_id,
            marks: editMarks,
            remarks: grade.remarks
          })
          .select();
        
        if (error) throw error;
        
        toast.success("Grade saved successfully");
      } else {
        // Update existing grade
        const { error } = await supabase
          .from("test_grades")
          .update({ marks: editMarks })
          .eq("id", grade.id);
        
        if (error) throw error;
        
        toast.success("Grade updated successfully");
      }
      
      setEditingStudentId(null);
      refetch();
    } catch (error: any) {
      toast.error(`Failed to save grade: ${error.message}`);
    }
  };

  // Update answer confidence score
  const handleUpdateAnswerScore = async (
    grade: TestGrade & { evaluation?: PaperEvaluation | null }, 
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
        refetch();
      } else {
        toast.error("Failed to update score: Invalid score format");
      }
    } catch (error: any) {
      toast.error(`Failed to update score: ${error.message}`);
      console.error("Error updating score:", error);
    }
  };

  return {
    test,
    grades,
    isLoading: isTestLoading || isGradesLoading,
    editingStudentId,
    setEditingStudentId,
    editMarks,
    setEditMarks,
    handleSaveMarks,
    handleUpdateAnswerScore,
    refetch
  };
}
