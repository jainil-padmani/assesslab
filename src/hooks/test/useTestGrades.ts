
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Test, TestGrade } from "@/types/tests";
import type { Student } from "@/types/dashboard";
import type { PaperEvaluation } from "../evaluation/useEvaluationData";

/**
 * Hook for fetching test grades with optimized query performance
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
      
      // Get all students in this class using the new index on class_id
      const { data: classStudents, error: classError } = await supabase
        .from("students")
        .select("*")
        .eq("class_id", test?.class_id || "")
        .order("name");
      
      if (classError) {
        toast.error("Failed to load students in this class");
        console.error("Failed to load students:", classError);
        throw classError;
      }
      
      // Get existing grades for this test using composite index on test_id
      const { data: existingGrades, error: gradesError } = await supabase
        .from("test_grades")
        .select("*")
        .eq("test_id", testId);
      
      if (gradesError) {
        toast.error("Failed to load test grades");
        console.error("Failed to load test grades:", gradesError);
        throw gradesError;
      }

      try {
        // Get answer sheets using the composite index on test_id and subject_id
        const { data: testAnswers, error: answersError } = await supabase
          .from("test_answers")
          .select("*")
          .eq("test_id", testId)
          .eq("subject_id", test.subject_id);
          
        if (answersError) {
          console.error("Error fetching test answers:", answersError);
          // Continue with execution even if test answers fetch fails
        }
        
        // Get evaluation data using the test_id index
        const { data: evaluations, error: evaluationsError } = await supabase
          .from("paper_evaluations")
          .select("*")
          .eq("test_id", testId);
          
        if (evaluationsError) {
          console.error("Failed to load evaluations:", evaluationsError);
          // Continue with execution even if evaluations fetch fails
        }
        
        // Map grades to students or create empty grades
        const studentGrades = (classStudents as Student[]).map(student => {
          // Use find() operations which are efficient since arrays are now smaller
          const existingGrade = (existingGrades as TestGrade[]).find(
            grade => grade.student_id === student.id
          );
          
          // Find answer sheet for this student if it exists
          const studentAnswerSheet = testAnswers?.find(
            answer => answer.student_id === student.id
          );
          
          // Find evaluation for this student if it exists
          const studentEvaluation = evaluations?.find(
            (evaluation: any) => evaluation.student_id === student.id
          );
          
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
        
        // Fallback with minimal data if detailed fetch fails
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
    enabled: !!testId && !!test,
    staleTime: 2 * 60 * 1000 // Cache valid for 2 minutes
  });

  return {
    grades,
    isGradesLoading,
    refetchGrades: refetch
  };
}
