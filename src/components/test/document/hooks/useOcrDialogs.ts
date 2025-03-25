
import { useState } from 'react';

/**
 * Hook to manage OCR preview dialogs
 */
export function useOcrDialogs() {
  const [showOcrQuestionDialog, setShowOcrQuestionDialog] = useState(false);
  const [showOcrAnswerDialog, setShowOcrAnswerDialog] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(0);

  const triggerRefresh = () => {
    setRefreshFlag(prev => prev + 1);
  };

  return {
    showOcrQuestionDialog,
    showOcrAnswerDialog,
    setShowOcrQuestionDialog,
    setShowOcrAnswerDialog,
    refreshFlag,
    triggerRefresh
  };
}
