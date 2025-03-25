
import { useState } from "react";

/**
 * Hook for managing evaluation state
 */
export function useEvaluationState() {
  const [evaluatingStudents, setEvaluatingStudents] = useState<string[]>([]);
  const [evaluationProgress, setEvaluationProgress] = useState(0);
  const [evaluationResults, setEvaluationResults] = useState<Record<string, any>>({});
  const [showResults, setShowResults] = useState(false);
  const [retryCount, setRetryCount] = useState<Record<string, number>>({});

  return {
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
  };
}
