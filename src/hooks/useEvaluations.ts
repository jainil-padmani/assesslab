
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import { EvaluationStatus, PaperEvaluation } from '@/types/assessments';
import { selectAllTestAnswersForTest } from '@/utils/assessment/rpcFunctions';

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
const fetchAllStudentEvaluations = async (testId: string): Promise<EvaluationData[]> => {
  if (!testId) return [];
  
  try {
    console.log("Fetching all student evaluations for test:", testId);
    
    // Get assessments with test_id or fallback to subject_id matching
    const { data: assessmentsData, error: assessmentsError } = await supabase
      .from('assessments_master')
      .select(`
        id,
        created_by,
        subject_id,
        options,
        created_at
      `)
      .eq('test_id', testId);
    
    if (assessmentsError) {
      console.error("Error fetching assessments:", assessmentsError);
      throw assessmentsError;
    }
    
    // Get all students related to these assessments
    const studentIds = assessmentsData
      ?.map(assessment => assessment.created_by)
      .filter(Boolean) || [];
    
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('id, name, gr_number, roll_number')
      .in('id', studentIds.length > 0 ? studentIds : ['no-students']);
    
    if (studentsError) {
      console.error("Error fetching students:", studentsError);
      throw studentsError;
    }
    
    // Get all evaluations for this test
    const { data: evaluationsData, error: evaluationsError } = await supabase
      .from('paper_evaluations')
      .select('*')
      .eq('test_id', testId);
    
    if (evaluationsError) {
      console.error("Error fetching evaluations:", evaluationsError);
      throw evaluationsError;
    }
    
    // Get all grades for this test
    const { data: gradesData, error: gradesError } = await supabase
      .from('test_grades')
      .select('*')
      .eq('test_id', testId);
    
    if (gradesError) {
      console.error("Error fetching grades:", gradesError);
      throw gradesError;
    }
    
    // Check for test_answers data
    let testAnswers: any[] = [];
    
    try {
      // Use RPC function to get test answers
      testAnswers = await selectAllTestAnswersForTest(testId) || [];
      console.log(`Found ${testAnswers.length} test answers`);
    } catch (err) {
      console.error("Error checking for test_answers:", err);
    }
    
    // Combine the data
    const studentData: EvaluationData[] = [];
    
    // Process each assessment
    assessmentsData?.forEach(assessment => {
      const studentId = assessment.created_by;
      
      if (!studentId) {
        console.warn("Assessment without student ID:", assessment);
        return;
      }
      
      // Find matching student
      const student = studentsData?.find(s => s.id === studentId);
      
      if (!student) {
        console.warn("Student not found for ID:", studentId);
        return;
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
      
      // Get answer sheet URL from options or test_answers
      let answerSheetUrl = null;
      let textContent = null;
      
      if (testAnswer) {
        answerSheetUrl = testAnswer.answer_sheet_url;
        textContent = testAnswer.text_content;
      } else if (assessment.options && typeof assessment.options === 'object') {
        // Try to get from options
        const options = assessment.options as Record<string, any>;
        answerSheetUrl = options.answerSheetUrl || null;
        textContent = options.textContent || null;
      }
      
      studentData.push({
        student,
        assessment_id: assessment.id,
        answer_sheet_url: answerSheetUrl,
        text_content: textContent,
        evaluation: evaluation || null,
        grade: grade || null,
        created_at: assessment.created_at
      });
    });
    
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
      .maybeSingle();

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
  
  const { data, isLoading, error, refetch: refetchEvaluations } = useQuery({
    queryKey: ['all-student-evaluations', testId],
    queryFn: () => fetchAllStudentEvaluations(testId),
    enabled: !!testId,
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

  // Function to get a student's answer sheet URL
  const getStudentAnswerSheetUrl = useCallback(async (studentId: string) => {
    const studentData = evaluationData.find(item => item.student.id === studentId);
    return studentData?.answer_sheet_url || null;
  }, [evaluationData]);

  const { mutate: updateEvaluation, isPending: isUpdateLoading } = useMutation({
    mutationFn: async ({ evaluation, studentId }: { evaluation: Json; studentId: string }) => {
      try {
        console.log(`Updating evaluation for student ${studentId} in test ${testId}`);

        const { data: existingEvaluation, error: existingError } = await supabase
          .from('paper_evaluations')
          .select('*')
          .eq('test_id', testId)
          .eq('student_id', studentId)
          .maybeSingle();

        if (existingError && existingError.code !== 'PGRST116') {
          console.error("Error fetching existing evaluation:", existingError);
          throw existingError;
        }

        if (existingEvaluation) {
          const { error: updateError } = await supabase
            .from('paper_evaluations')
            .update({ 
              evaluation_data: evaluation, 
              updated_at: new Date().toISOString(),
              status: EvaluationStatus.EVALUATED
            })
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
              status: EvaluationStatus.EVALUATED,
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
        toast.error(`Failed to update evaluation: ${(error as Error).message}`);
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
      toast.error(`Failed to fetch evaluation: ${(error as Error).message}`);
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
    isUpdateLoading,
    handleEvaluate,
    refetchEvaluations,
    getStudentAnswerSheetUrl
  };
}
