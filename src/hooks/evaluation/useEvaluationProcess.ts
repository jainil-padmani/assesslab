
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getAnswerSheetUrl, getAnswerSheetZipUrl } from "@/utils/assessment/fileUploadUtils";
import type { Student } from "@/types/dashboard";

/**
 * Hook for managing the evaluation process
 */
export function useEvaluationProcess(
  selectedTest: string, 
  selectedSubject: string,
  refetchCallback: () => void
) {
  const [evaluatingStudents, setEvaluatingStudents] = useState<string[]>([]);
  const [evaluationProgress, setEvaluationProgress] = useState(0);
  const [evaluationResults, setEvaluationResults] = useState<Record<string, any>>({});
  const [showResults, setShowResults] = useState(false);
  const [retryCount, setRetryCount] = useState<Record<string, number>>({});

  const evaluatePaperMutation = useMutation({
    mutationFn: async ({ 
      studentId, 
      testId, 
      subjectId, 
      questionPaperUrl,
      questionPaperTopic,
      answerKeyUrl,
      answerKeyTopic,
      studentInfo,
      retryAttempt = 0
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
      };
      retryAttempt?: number;
    }) => {
      console.log("Starting evaluation for student:", studentInfo.name, "for test:", testId, "attempt:", retryAttempt);
      
      // Get the student's answer sheet URL
      const answerSheetUrl = await getAnswerSheetUrl(studentId, subjectId, testId);
      
      if (!answerSheetUrl) {
        throw new Error("No answer sheet found for this student");
      }
      
      // Get the zip URL if available
      const zipUrl = await getAnswerSheetZipUrl(studentId, subjectId, testId);
      
      // Check for existing evaluations
      const { data: existingEvaluations, error: fetchError } = await supabase
        .from('paper_evaluations')
        .select('id, status')
        .eq('test_id', testId)
        .eq('student_id', studentId);
      
      if (fetchError) {
        console.error("Error checking existing evaluations:", fetchError);
        throw new Error(`Error checking existing evaluations: ${fetchError.message}`);
      }
      
      // Create or update evaluation record
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
      
      // Call the edge function to evaluate the paper
      try {
        // Add cache-busting parameters to URLs
        const timestamp = Date.now();
        const cacheBustedQuestionUrl = questionPaperUrl.includes('?') 
          ? `${questionPaperUrl}&cache=${timestamp}` 
          : `${questionPaperUrl}?cache=${timestamp}`;
          
        const cacheBustedAnswerKeyUrl = answerKeyUrl.includes('?') 
          ? `${answerKeyUrl}&cache=${timestamp}` 
          : `${answerKeyUrl}?cache=${timestamp}`;
          
        const cacheBustedAnswerSheetUrl = answerSheetUrl.includes('?') 
          ? `${answerSheetUrl}&cache=${timestamp}` 
          : `${answerSheetUrl}?cache=${timestamp}`;
          
        let cacheBustedZipUrl = null;
        if (zipUrl) {
          cacheBustedZipUrl = zipUrl.includes('?') 
            ? `${zipUrl}&cache=${timestamp}` 
            : `${zipUrl}?cache=${timestamp}`;
        }
        
        const evaluationResponse = await supabase.functions.invoke('evaluate-paper', {
          body: {
            questionPaper: {
              url: cacheBustedQuestionUrl,
              topic: questionPaperTopic
            },
            answerKey: {
              url: cacheBustedAnswerKeyUrl,
              topic: answerKeyTopic
            },
            studentAnswer: {
              url: cacheBustedAnswerSheetUrl,
              zip_url: cacheBustedZipUrl
            },
            studentInfo,
            testId,
            retryAttempt
          }
        });
        
        if (evaluationResponse.error) {
          throw new Error(`Edge function error: ${evaluationResponse.error.message}`);
        }
        
        const evaluationData = evaluationResponse.data;
        
        // Update evaluation with results
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
        
        // Update test grades if we have score data
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
        
        // Save extracted text if available
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
        
        // Clear retry count for this student
        setRetryCount(prev => {
          const newCounts = {...prev};
          delete newCounts[studentId];
          return newCounts;
        });
        
        return evaluationData;
      } catch (error) {
        console.error("Evaluation failed:", error);
        
        // Check if this is a download or OCR error that might be resolved with a retry
        const errorMessage = error.message || '';
        const isRetryableError = 
          errorMessage.includes('Timeout while downloading') || 
          errorMessage.includes('invalid_image_url') ||
          errorMessage.includes('Failed to download') ||
          errorMessage.includes('OCR extraction failed');
          
        // Update current retry count
        const currentRetryCount = retryCount[studentId] || 0;
        
        // Try to automatically retry for timeout errors (up to 2 times)
        if (isRetryableError && currentRetryCount < 2) {
          // Update retry count
          const newRetryCount = currentRetryCount + 1;
          setRetryCount(prev => ({...prev, [studentId]: newRetryCount}));
          
          // Update evaluation status to in_progress (for retry)
          await supabase
            .from('paper_evaluations')
            .update({
              evaluation_data: {
                error: errorMessage,
                retry_attempt: newRetryCount,
                last_error_timestamp: new Date().toISOString()
              },
              status: 'in_progress',
              updated_at: new Date().toISOString()
            })
            .eq('id', evaluationId);
            
          // Delay and retry
          const delayMs = 5000 * Math.pow(2, newRetryCount - 1); // 5s, 10s
          toast.info(`Retrying evaluation for ${studentInfo.name} in ${delayMs/1000}s (attempt ${newRetryCount}/2)...`);
          
          // Wait for delay
          await new Promise(resolve => setTimeout(resolve, delayMs));
          
          // Recursive call with retry attempt count
          return evaluatePaperMutation.mutateAsync({
            studentId, 
            testId, 
            subjectId, 
            questionPaperUrl,
            questionPaperTopic,
            answerKeyUrl,
            answerKeyTopic,
            studentInfo,
            retryAttempt: newRetryCount
          });
        } else {
          // Update evaluation status to failed (no more retries or non-retryable error)
          await supabase
            .from('paper_evaluations')
            .update({
              evaluation_data: {
                error: errorMessage,
                retries_attempted: currentRetryCount
              },
              status: 'failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', evaluationId);
            
          throw error;
        }
      }
    },
    onSuccess: (data, variables) => {
      setEvaluationResults(prev => ({
        ...prev,
        [variables.studentId]: data
      }));
      
      refetchCallback();
      
      toast.success(`Evaluation completed for ${variables.studentInfo.name}`);
    },
    onError: (error, variables) => {
      console.error('Error evaluating paper:', error);
      
      // Get retry count for this student
      const currentRetryCount = retryCount[variables.studentId] || 0;
      
      // Provide more context in the error message if we've retried
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (currentRetryCount > 0) {
        errorMessage += ` (after ${currentRetryCount} retry attempts)`;
      }
      
      toast.error(`Evaluation failed for ${variables.studentInfo.name}: ${errorMessage}`);
      
      // Clear retry count from state
      setRetryCount(prev => {
        const newCounts = {...prev};
        delete newCounts[variables.studentId];
        return newCounts;
      });
    }
  });

  return {
    evaluatingStudents,
    setEvaluatingStudents,
    evaluationProgress,
    setEvaluationProgress,
    evaluationResults,
    setEvaluationResults,
    showResults,
    setShowResults,
    evaluatePaperMutation
  };
}
