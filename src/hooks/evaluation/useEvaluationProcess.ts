
import { useEvaluationState } from "./useEvaluationState";
import { useEvaluationMutation } from "./useEvaluationMutation";

/**
 * Hook for managing the evaluation process
 */
export function useEvaluationProcess(
  selectedTest: string, 
  selectedSubject: string,
  refetchCallback: () => void
) {
  // Get evaluation state
  const {
    evaluatingStudents,
    setEvaluatingStudents,
    evaluationProgress,
    setEvaluationProgress,
    evaluationResults,
    setEvaluationResults,
    showResults,
    setShowResults,
    retryCount,
    setRetryCount
  } = useEvaluationState();

  // Get evaluation mutation
  const evaluatePaperMutation = useEvaluationMutation(
    refetchCallback,
    retryCount,
    setRetryCount,
    setEvaluationResults
  );

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
