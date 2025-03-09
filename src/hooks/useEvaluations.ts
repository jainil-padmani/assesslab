
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Student, Subject } from "@/types/dashboard";
import type { Class } from "@/hooks/useClassData";

export type EvaluationStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface PaperEvaluation {
  id: string;
  test_id: string;
  student_id: string;
  subject_id: string;
  evaluation_data: any;
  status: EvaluationStatus;
  created_at: string;
  updated_at: string;
}

export function useEvaluations(
  selectedTest: string, 
  selectedSubject: string,
  classStudents: Student[]
) {
  const [evaluatingStudents, setEvaluatingStudents] = useState<string[]>([]);
  const [evaluationProgress, setEvaluationProgress] = useState(0);
  const [evaluationResults, setEvaluationResults] = useState<Record<string, any>>({});
  const [showResults, setShowResults] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch evaluations
  const { data: evaluations = [], refetch: refetchEvaluations } = useQuery({
    queryKey: ['evaluations', selectedTest],
    queryFn: async () => {
      if (!selectedTest) return [];
      
      const { data, error } = await supabase
        .from('paper_evaluations')
        .select('*')
        .eq('test_id', selectedTest);
      
      if (error) {
        console.error("Error fetching evaluations:", error);
        return [];
      }
      
      return data as PaperEvaluation[];
    },
    enabled: !!selectedTest
  });

  // Mutation for evaluating one student's paper
  const evaluatePaperMutation = useMutation({
    mutationFn: async ({ 
      studentId, 
      testId, 
      subjectId, 
      answerSheetUrl,
      questionPaperUrl,
      questionPaperTopic,
      answerKeyUrl,
      answerKeyTopic,
      studentInfo
    }: { 
      studentId: string; 
      testId: string; 
      subjectId: string; 
      answerSheetUrl: string;
      questionPaperUrl: string;
      questionPaperTopic: string;
      answerKeyUrl: string;
      answerKeyTopic: string;
      studentInfo: {
        id: string;
        name: string;
        roll_number: string;
        class: string;
        subject: string;
      }
    }) => {
      console.log("Starting evaluation for student:", studentInfo.name);
      
      // Update status to in_progress
      const { error: statusError } = await supabase
        .from('paper_evaluations')
        .upsert({
          test_id: testId,
          student_id: studentId,
          subject_id: subjectId,
          evaluation_data: {},
          status: 'in_progress',
          updated_at: new Date().toISOString()
        });
      
      if (statusError) {
        console.error("Error updating evaluation status:", statusError);
      }
      
      // Call the edge function to evaluate the paper
      const { data, error } = await supabase.functions.invoke('evaluate-paper', {
        body: {
          questionPaper: {
            url: questionPaperUrl,
            topic: questionPaperTopic
          },
          answerKey: {
            url: answerKeyUrl,
            topic: answerKeyTopic
          },
          studentAnswer: {
            url: answerSheetUrl,
            studentId
          },
          studentInfo
        }
      });
      
      if (error) {
        console.error("Edge function error:", error);
        
        // Update status to failed
        await supabase
          .from('paper_evaluations')
          .upsert({
            test_id: testId,
            student_id: studentId,
            subject_id: subjectId,
            evaluation_data: {},
            status: 'failed',
            updated_at: new Date().toISOString()
          });
        
        throw error;
      }
      
      console.log("Evaluation data received:", data ? "success" : "empty");
      
      // Store the evaluation results
      const { error: dbError } = await supabase
        .from('paper_evaluations')
        .upsert({
          test_id: testId,
          student_id: studentId,
          subject_id: subjectId,
          evaluation_data: data,
          status: 'completed',
          updated_at: new Date().toISOString()
        });
      
      if (dbError) {
        console.error("Database error updating evaluation:", dbError);
        throw dbError;
      }
      
      // Update test grades with the score
      if (data?.summary?.totalScore) {
        const [score, maxScore] = data.summary.totalScore;
        
        console.log(`Updating grades for ${studentInfo.name}: ${score}/${maxScore}`);
        
        const { error: gradeError } = await supabase
          .from('test_grades')
          .upsert({
            test_id: testId,
            student_id: studentId,
            marks: score,
            remarks: `Auto-evaluated: ${score}/${maxScore}`
          });
        
        if (gradeError) {
          console.error('Error updating test grade:', gradeError);
        }
      }
      
      return data;
    },
    onSuccess: (data, variables) => {
      // Update the evaluation results
      setEvaluationResults(prev => ({
        ...prev,
        [variables.studentId]: data
      }));
      
      // Refetch evaluations
      refetchEvaluations();
      
      toast.success(`Evaluation completed for ${variables.studentInfo.name}`);
    },
    onError: (error, variables) => {
      console.error('Error evaluating paper:', error);
      toast.error(`Evaluation failed for ${variables.studentInfo.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  const getStudentEvaluationStatus = (studentId: string): EvaluationStatus => {
    const evaluation = evaluations.find(e => e.student_id === studentId);
    return evaluation?.status || 'pending';
  };

  const getStudentAnswerSheetUrl = async (studentId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('answer_sheet_url')
        .eq('student_id', studentId)
        .eq('subject_id', selectedSubject)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        console.error('Error fetching answer sheet URL:', error);
        return null;
      }
      
      return data?.answer_sheet_url || null;
    } catch (error) {
      console.error('Error in getStudentAnswerSheetUrl:', error);
      return null;
    }
  };

  return {
    evaluations,
    evaluatingStudents,
    setEvaluatingStudents,
    evaluationProgress,
    setEvaluationProgress,
    evaluationResults,
    setEvaluationResults,
    showResults,
    setShowResults,
    refetchEvaluations,
    evaluatePaperMutation,
    getStudentEvaluationStatus,
    getStudentAnswerSheetUrl
  };
}
