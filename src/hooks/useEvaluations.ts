import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getAnswerSheetUrl, 
  getAnswerSheetZipUrl 
} from "@/utils/assessment/fileUploadUtils";
import type { Student } from "@/types/dashboard";

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
      
      console.log(`Found ${data?.length || 0} evaluations for test ${selectedTest}`);
      return data as PaperEvaluation[];
    },
    enabled: !!selectedTest
  });

  const evaluatePaperMutation = useMutation({
    mutationFn: async ({ 
      studentId, 
      testId, 
      subjectId, 
      questionPaperUrl,
      questionPaperTopic,
      answerKeyUrl,
      answerKeyTopic,
      studentInfo
    }: { 
      studentId: string; 
      testId: string; 
      subjectId: string; 
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
      console.log("Starting evaluation for student:", studentInfo.name, "for test:", testId);
      
      const answerSheetUrl = await getAnswerSheetUrl(studentId, subjectId, testId);
      
      if (!answerSheetUrl) {
        throw new Error("No answer sheet found for this student");
      }
      
      const zipUrl = await getAnswerSheetZipUrl(studentId, subjectId, testId);
      
      const { data: existingEvaluations, error: fetchError } = await supabase
        .from('paper_evaluations')
        .select('id, status')
        .eq('test_id', testId)
        .eq('student_id', studentId);
      
      if (fetchError) {
        console.error("Error checking existing evaluations:", fetchError);
        throw new Error(`Error checking existing evaluations: ${fetchError.message}`);
      }
      
      let evaluationId = '';
      if (existingEvaluations && existingEvaluations.length > 0) {
        evaluationId = existingEvaluations[0].id;
        console.log(`Found existing evaluation (ID: ${evaluationId}) - will update`);
        
        const { error: updateError } = await supabase
          .from('paper_evaluations')
          .update({
            evaluation_data: {},
            status: 'in_progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', evaluationId);
        
        if (updateError) {
          console.error("Error updating evaluation status:", updateError);
        }
      } else {
        const { data: newEval, error: insertError } = await supabase
          .from('paper_evaluations')
          .insert({
            test_id: testId,
            student_id: studentId,
            subject_id: subjectId,
            evaluation_data: {},
            status: 'in_progress',
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();
        
        if (insertError) {
          console.error("Error creating evaluation:", insertError);
          throw new Error(`Error creating evaluation: ${insertError.message}`);
        }
        
        evaluationId = newEval.id;
        console.log(`Created new evaluation with ID: ${evaluationId}`);
      }
      
      try {
        const evaluationResponse = await supabase.functions.invoke('evaluate-paper', {
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
              zip_url: zipUrl
            },
            studentInfo,
            testId
          }
        });
        
        if (evaluationResponse.error) {
          throw new Error(`Edge function error: ${evaluationResponse.error.message}`);
        }
        
        const evaluationData = evaluationResponse.data;
        
        const { error: dbError } = await supabase
          .from('paper_evaluations')
          .update({
            evaluation_data: evaluationData,
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', evaluationId);
        
        if (dbError) {
          console.error("Database error updating evaluation:", dbError);
          throw new Error(`Database error: ${dbError.message}`);
        }
        
        if (evaluationData?.summary?.totalScore) {
          const [score, maxScore] = evaluationData.summary.totalScore;
          
          console.log(`Updating grades for ${studentInfo.name}: ${score}/${maxScore}`);
          
          const { data: existingGrade } = await supabase
            .from('test_grades')
            .select('id')
            .eq('test_id', testId)
            .eq('student_id', studentId)
            .maybeSingle();
            
          if (existingGrade) {
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
        
        if (evaluationData.text) {
          const { error: textUpdateError } = await supabase
            .from('test_answers')
            .update({
              text_content: evaluationData.text
            })
            .eq('student_id', studentId)
            .eq('subject_id', subjectId)
            .eq('test_id', testId);
            
          if (textUpdateError) {
            console.error('Error updating extracted text:', textUpdateError);
          }
        }
        
        return evaluationData;
      } catch (error) {
        console.error("Evaluation failed:", error);
        
        await supabase
          .from('paper_evaluations')
          .update({
            evaluation_data: {},
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', evaluationId);
          
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      setEvaluationResults(prev => ({
        ...prev,
        [variables.studentId]: data
      }));
      
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
    if (!selectedSubject || !selectedTest) return null;
    return getAnswerSheetUrl(studentId, selectedSubject, selectedTest);
  };

  const deleteEvaluation = useCallback(async (evaluationId: string, studentId?: string) => {
    try {
      if (!selectedTest) {
        toast.error('No test selected');
        return false;
      }
      
      console.log(`Starting permanent deletion for evaluation ${evaluationId} and student ${studentId || 'unknown'}`);
      
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
      
      const { error: evalError } = await supabase
        .from('paper_evaluations')
        .delete()
        .eq('id', targetEvaluationId);
      
      if (evalError) {
        console.error("Error deleting paper evaluations:", evalError);
        throw evalError;
      }
      
      console.log("Successfully deleted from paper_evaluations table");
      
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
      
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['evaluations', selectedTest] });
      queryClient.invalidateQueries({ queryKey: ['test-grades'] });
      queryClient.invalidateQueries({ queryKey: ['test-grades', selectedTest] });
      
      setEvaluationResults(prev => {
        if (targetStudentId) {
          const updated = { ...prev };
          delete updated[targetStudentId];
          return updated;
        }
        return prev;
      });
      
      await refetchEvaluations();
      
      console.log("Successfully deleted evaluation:", targetEvaluationId);
      return true;
    } catch (error) {
      console.error('Error deleting evaluation:', error);
      return false;
    }
  }, [selectedTest, evaluations, queryClient, refetchEvaluations]);

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
    deleteEvaluation
  };
}
