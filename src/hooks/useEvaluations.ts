import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import { PaperEvaluation, EvaluationStatus } from '@/types/assessments';

export interface EvaluationData {
  student: {
    id: string;
    name: string;
    gr_number: string | null;
    roll_number: string | null;
  };
  assessment_id: string;
  answer_sheet_url: string | null;
  text_content: string | null;
  evaluation: PaperEvaluation | null;
  grade: any | null;
  created_at: string;
}

// For type safety later
export type { PaperEvaluation };
export { EvaluationStatus };

// Add proper type checks and null handling to fetchAllStudentEvaluations function
const fetchAllStudentEvaluations = async (testId: string) => {
  try {
    console.log("Fetching all student evaluations for test:", testId);
    
    // First, get list of students who have assessments for this test
    const { data: assessmentsData, error: assessmentsError } = await supabase
      .from('assessments_master')
      .select(`
        *,
        student:student_id(*)
      `)
      .eq('test_id', testId)
      .order('created_at', { ascending: false });
    
    if (assessmentsError) {
      console.error("Error fetching assessments:", assessmentsError);
      throw assessmentsError;
    }
    
    console.log(`Found ${assessmentsData?.length || 0} assessments`);
    
    // Now get all evaluations for this test
    const { data: evaluationsData, error: evaluationsError } = await supabase
      .from('paper_evaluations')
      .select('*')
      .eq('test_id', testId);
    
    if (evaluationsError) {
      console.error("Error fetching evaluations:", evaluationsError);
      throw evaluationsError;
    }
    
    console.log(`Found ${evaluationsData?.length || 0} evaluations`);
    
    // Get all grades for this test
    const { data: gradesData, error: gradesError } = await supabase
      .from('test_grades')
      .select('*')
      .eq('test_id', testId);
    
    if (gradesError) {
      console.error("Error fetching grades:", gradesError);
      throw gradesError;
    }
    
    console.log(`Found ${gradesData?.length || 0} grades`);
    
    // Check for test_answers data
    let testAnswers: any[] = [];
    
    try {
      // Use RPC function to check if table exists
      const { data: tableExists } = await supabase.rpc(
        'check_table_exists',
        { table_name: 'test_answers' }
      );
        
      if (tableExists) {
        // Use RPC function to get test answers
        const { data: answersData } = await supabase.rpc(
          'select_all_test_answers_for_test',
          { test_id_param: testId }
        );
          
        if (answersData) {
          testAnswers = answersData;
          console.log(`Found ${testAnswers.length} test answers`);
        }
      }
    } catch (err) {
      console.error("Error checking for test_answers:", err);
    }
    
    // Combine the data
    const studentData = assessmentsData && assessmentsData.length > 0 
      ? assessmentsData.map(assessment => {
          const studentId = assessment.created_by || assessment.student?.id;
          
          if (!studentId) {
            console.warn("Assessment without student ID:", assessment);
            return null;
          }
          
          // Find matching evaluation if it exists
          const evaluation = evaluationsData?.find(e => 
            e.student_id === studentId
          );
          
          // Find matching grade if it exists
          const grade = gradesData?.find(g => 
            g.student_id === studentId
          );
          
          // Find matching test answer if it exists
          const testAnswer = testAnswers.find(a =>
            a.student_id === studentId
          );
          
          // Extract the student data safely
          const student = assessment.student || { id: studentId, name: 'Unknown' };
          
          // Get answer sheet URL from options or test_answers
          let answerSheetUrl = null;
          let textContent = null;
          
          if (testAnswer) {
            answerSheetUrl = testAnswer.answer_sheet_url;
            textContent = testAnswer.text_content;
          } else if (assessment.options && typeof assessment.options === 'object') {
            // Try to get from options
            const options = assessment.options as any;
            answerSheetUrl = options.answerSheetUrl || null;
            textContent = options.textContent || null;
          }
          
          return {
            student,
            assessment_id: assessment.id,
            answer_sheet_url: answerSheetUrl,
            text_content: textContent,
            evaluation: evaluation || null,
            grade: grade || null,
            created_at: assessment.created_at
          };
        }).filter(Boolean) as EvaluationData[]
      : [];
    
    return studentData;
  } catch (error) {
    console.error('Error fetching all student evaluations:', error);
    throw error;
  }
};

const fetchStudentEvaluation = async (testId: string, studentId: string) => {
  try {
    console.log(`Fetching evaluation for student ${studentId} in test ${testId}`);

    const { data, error } = await supabase
      .from('paper_evaluations')
      .select('*')
      .eq('test_id', testId)
      .eq('student_id', studentId)
      .single();

    if (error) {
      console.error("Error fetching evaluation:", error);
      return null;
    }

    console.log("Evaluation data:", data);
    return data;
  } catch (error) {
    console.error("Error in fetchStudentEvaluation:", error);
    throw error;
  }
};

export function useEvaluations(testId: string, subjectId: string, studentId?: string) {
  const queryClient = useQueryClient();
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(studentId || null);
  const [evaluationData, setEvaluationData] = useState<EvaluationData[]>([]);
  const [currentEvaluation, setCurrentEvaluation] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['all-student-evaluations', testId],
    queryFn: () => fetchAllStudentEvaluations(testId),
    meta: {
      onError: (err: Error) => {
        toast.error(`Failed to fetch student evaluations: ${err.message}`);
      }
    }
  });

  useEffect(() => {
    if (data) {
      setEvaluationData(data);
    }
  }, [data]);

  useEffect(() => {
    if (studentId) {
      setCurrentStudentId(studentId);
    }
  }, [studentId]);

  useEffect(() => {
    if (currentStudentId) {
      const studentEval = evaluationData?.find(item => item.student.id === currentStudentId);
      setCurrentEvaluation(studentEval?.evaluation || null);
    }
  }, [currentStudentId, evaluationData]);

  const { mutate: updateEvaluation } = useMutation({
    mutationFn: async ({ evaluation, studentId }: { evaluation: Json; studentId: string }) => {
      try {
        console.log(`Updating evaluation for student ${studentId} in test ${testId}`);

        const { data: existingEvaluation, error: existingError } = await supabase
          .from('paper_evaluations')
          .select('*')
          .eq('test_id', testId)
          .eq('student_id', studentId)
          .single();

        if (existingError && existingError.code !== 'PGRST116') {
          console.error("Error fetching existing evaluation:", existingError);
          throw existingError;
        }

        if (existingEvaluation) {
          const { error: updateError } = await supabase
            .from('paper_evaluations')
            .update({ evaluation_data: evaluation, updated_at: new Date().toISOString() })
            .eq('test_id', testId)
            .eq('student_id', studentId);

          if (updateError) {
            console.error("Error updating evaluation:", updateError);
            throw updateError;
          }

          toast.success("Evaluation updated successfully");
        } else {
          const { error: insertError } = await supabase
            .from('paper_evaluations')
            .insert({
              test_id: testId,
              student_id: studentId,
              subject_id: subjectId,
              evaluation_data: evaluation,
              status: 'evaluated',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            console.error("Error inserting evaluation:", insertError);
            throw insertError;
          }

          toast.success("Evaluation created successfully");
        }

        // Invalidate the query to refetch the data
        await queryClient.invalidateQueries({ queryKey: ['all-student-evaluations', testId] });
        return { evaluation, studentId };
      } catch (error) {
        console.error("Error during evaluation update:", error);
        toast.error(`Failed to update evaluation: ${error.message}`);
        throw error;
      }
    }
  });

  const handleEvaluate = useCallback(async (studentId: string) => {
    setCurrentStudentId(studentId);
    setIsEvaluating(true);
    try {
      const evalData = evaluationData?.find(item => item.student.id === studentId);
      if (evalData?.evaluation) {
        setCurrentEvaluation(evalData.evaluation);
      } else {
        const newEval = await fetchStudentEvaluation(testId, studentId);
        setCurrentEvaluation(newEval);
      }
    } catch (error) {
      console.error("Error fetching evaluation:", error);
      toast.error(`Failed to fetch evaluation: ${error.message}`);
    } finally {
      setIsEvaluating(false);
    }
  }, [evaluationData, testId]);

  return {
    evaluationData,
    currentEvaluation,
    currentStudentId,
    isLoading,
    isEvaluating,
    error,
    setCurrentStudentId,
    updateEvaluation,
    isUpdateLoading: false,
    handleEvaluate
  };
}
