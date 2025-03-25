
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Test, TestGrade } from "@/types/tests";
import type { Student } from "@/types/dashboard";
import type { PaperEvaluation } from "../evaluation/useEvaluationData";

/**
 * Hook for fetching test grades
 */
export function useTestGrades(testId: string | undefined, test: any | null) {
  const { 
    data: grades, 
    isLoading: isGradesLoading, 
    refetch 
  } = useQuery({
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

      try {
        // Get answer sheets for students in this test from test_answers table
        let testAnswers: any[] = [];
        try {
          const { data: answerData, error: answersError } = await supabase
            .from("test_answers")
            .select("*")
            .eq("subject_id", test.subject_id)
            .eq("test_id", testId);
            
          if (!answersError) {
            testAnswers = answerData as any[];
          }
        } catch (error) {
          console.error("Error fetching test answers:", error);
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
          
          // Find answer sheet for this student if it exists
          const studentAnswerSheet = testAnswers.find(
            answer => answer.student_id === student.id
          );
          
          // Find evaluation for this student if it exists
          const studentEvaluation = evaluations ? evaluations.find(
            (evaluation: any) => evaluation.student_id === student.id
          ) : null;
          
          if (existingGrade) {
            return {
              ...existingGrade,
              student,
              answer_sheet_url: studentAnswerSheet?.answer_sheet_url || null,
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
              answer_sheet_url: studentAnswerSheet?.answer_sheet_url || null,
              evaluation: studentEvaluation
            };
          }
        });
        
        return studentGrades;
      } catch (error) {
        console.error("Error fetching test answer data:", error);
        
        // Return grades without test answer data in case of error
        const studentGrades = (classStudents as Student[]).map(student => {
          const existingGrade = (existingGrades as TestGrade[]).find(
            grade => grade.student_id === student.id
          );
          
          if (existingGrade) {
            return {
              ...existingGrade,
              student,
              answer_sheet_url: null,
              evaluation: null
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
              answer_sheet_url: null,
              evaluation: null
            };
          }
        });
        
        return studentGrades;
      }
    },
    enabled: !!testId && !!test
  });

  return {
    grades,
    isGradesLoading,
    refetchGrades: refetch
  };
}
