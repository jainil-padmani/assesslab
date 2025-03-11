import { useState, useCallback } from "react";
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
      
      console.log("Fetching evaluations for test:", selectedTest);
      
      const { data, error } = await supabase
        .from('paper_evaluations')
        .select('*')
        .eq('test_id', selectedTest);
      
      if (error) {
        console.error("Error fetching evaluations:", error);
        return [];
      }
      
      console.log(`Found ${data?.length || 0} evaluations`);
      return data as PaperEvaluation[];
    },
    enabled: !!selectedTest,
    staleTime: 0
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
      
      try {
        // Call the edge function to evaluate the paper
        console.log("Invoking edge function with parameters:", {
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
        });
        
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
          
          throw new Error(`Edge function error: ${error.message}`);
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
          throw new Error(`Database error: ${dbError.message}`);
        }
        
        // Update test grades with the score
        if (data?.summary?.totalScore) {
          const [score, maxScore] = data.summary.totalScore;
          
          console.log(`Updating grades for ${studentInfo.name}: ${score}/${maxScore}`);
          
          // First check if a grade already exists
          const { data: existingGrade } = await supabase
            .from('test_grades')
            .select('id')
            .eq('test_id', testId)
            .eq('student_id', studentId)
            .maybeSingle();
            
          if (existingGrade) {
            // Update existing grade
            const { error: updateError } = await supabase
              .from('test_grades')
              .update({
                marks: score,
                remarks: `Auto-evaluated: ${score}/${maxScore}`
              })
              .eq('id', existingGrade.id);
              
            if (updateError) {
              console.error('Error updating test grade:', updateError);
            }
          } else {
            // Insert new grade
            const { error: insertError } = await supabase
              .from('test_grades')
              .insert({
                test_id: testId,
                student_id: studentId,
                marks: score,
                remarks: `Auto-evaluated: ${score}/${maxScore}`
              });
              
            if (insertError) {
              console.error('Error inserting test grade:', insertError);
            }
          }
        }
        
        return data;
      } catch (error) {
        console.error("Evaluation failed:", error);
        
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

  // Enhanced delete evaluation function for permanent deletion
  const deleteEvaluation = useCallback(async (evaluationId: string, studentId?: string) => {
    try {
      if (!selectedTest) {
        toast.error('No test selected');
        return false;
      }
      
      console.log(`Starting permanent deletion for evaluation ${evaluationId} and student ${studentId || 'unknown'}`);
      
      // If studentId is provided but evaluationId isn't specific, find the evaluation
      let targetEvaluationId = evaluationId;
      let targetStudentId = studentId;
      
      if (studentId && evaluationId === studentId) {
        const evaluation = evaluations.find(e => e.student_id === studentId && e.test_id === selectedTest);
        if (evaluation) {
          targetEvaluationId = evaluation.id;
          targetStudentId = evaluation.student_id;
        } else {
          console.error("Evaluation not found for studentId:", studentId);
          return false;
        }
      }
      
      // Delete from paper_evaluations table
      const { error: evalError } = await supabase
        .from('paper_evaluations')
        .delete()
        .eq('id', targetEvaluationId);
      
      if (evalError) {
        console.error("Error deleting paper evaluations:", evalError);
        throw evalError;
      }
      
      console.log("Successfully deleted from paper_evaluations table");
      
      // Delete the corresponding test grade if studentId is provided
      if (targetStudentId) {
        const { error: gradeError } = await supabase
          .from('test_grades')
          .delete()
          .eq('student_id', targetStudentId)
          .eq('test_id', selectedTest);
        
        if (gradeError) {
          console.error('Error deleting test grade:', gradeError);
          // Continue even if there's an error deleting the grade
        } else {
          console.log("Successfully deleted from test_grades table");
        }
      }
      
      // Force invalidate queries to ensure fresh data on next fetch
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['evaluations', selectedTest] });
      queryClient.invalidateQueries({ queryKey: ['test-grades'] });
      queryClient.invalidateQueries({ queryKey: ['test-grades', selectedTest] });
      
      // Update local state to remove the deleted evaluation immediately
      setEvaluationResults(prev => {
        if (targetStudentId) {
          const updated = { ...prev };
          delete updated[targetStudentId];
          return updated;
        }
        return prev;
      });
      
      console.log("Successfully deleted evaluation:", targetEvaluationId);
      return true;
    } catch (error) {
      console.error('Error deleting evaluation:', error);
      return false;
    }
  }, [selectedTest, evaluations, queryClient]);

  // Batch delete multiple evaluations at once
  const batchDeleteEvaluations = useCallback(async (evaluationsToDelete: { id: string, studentId: string }[]) => {
    try {
      if (!selectedTest || evaluationsToDelete.length === 0) {
        return;
      }
      
      console.log(`Starting batch deletion for ${evaluationsToDelete.length} evaluations`);
      
      // Process deletions in parallel for efficiency
      const results = await Promise.allSettled(
        evaluationsToDelete.map(async ({ id, studentId }) => {
          // Delete the evaluation
          const { error: evalError } = await supabase
            .from('paper_evaluations')
            .delete()
            .eq('id', id);
          
          if (evalError) {
            console.error(`Error deleting evaluation ${id}:`, evalError);
            throw evalError;
          }
          
          // Delete the corresponding test grade
          if (studentId) {
            const { error: gradeError } = await supabase
              .from('test_grades')
              .delete()
              .eq('student_id', studentId)
              .eq('test_id', selectedTest);
            
            if (gradeError) {
              console.error(`Error deleting test grade for student ${studentId}:`, gradeError);
              // Continue despite grade deletion error
            }
          }
          
          return { id, studentId, success: true };
        })
      );
      
      // Log results
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;
      
      console.log(`Batch deletion completed: ${successCount} successful, ${failCount} failed`);
      
      // Force invalidate all relevant queries with immediate refetch
      queryClient.invalidateQueries({ 
        queryKey: ['evaluations'],
        refetchType: 'all'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['evaluations', selectedTest],
        refetchType: 'all'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['test-grades'],
        refetchType: 'all'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['test-grades', selectedTest],
        refetchType: 'all'
      });
      
      // Force an immediate data refetch
      await queryClient.refetchQueries({ 
        queryKey: ['evaluations', selectedTest],
        type: 'active'
      });
      
    } catch (error) {
      console.error('Error in batchDeleteEvaluations:', error);
      throw error;
    }
  }, [selectedTest, queryClient]);

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
    getStudentAnswerSheetUrl,
    deleteEvaluation,
    batchDeleteEvaluations
  };
}
