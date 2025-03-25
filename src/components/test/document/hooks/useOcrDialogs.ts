
import { useState } from 'react';

/**
 * Hook to manage OCR preview dialogs
 */
export function useOcrDialogs() {
  const [showOcrQuestionDialog, setShowOcrQuestionDialog] = useState(false);
  const [showOcrAnswerDialog, setShowOcrAnswerDialog] = useState(false);

  return {
    showOcrQuestionDialog,
    showOcrAnswerDialog,
    setShowOcrQuestionDialog,
    setShowOcrAnswerDialog
  };
}
