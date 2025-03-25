
import { useOcrStatus } from './useOcrStatus';
import { useTextEditor } from './useTextEditor';
import { useOcrProcessor } from './useOcrProcessor';
import { useOcrDialogs } from './useOcrDialogs';

interface OcrProcessingProps {
  questionPaperUrl: string;
  answerKeyUrl: string;
}

/**
 * Main hook that combines all OCR-related functionality
 */
export function useOcrProcessing({ questionPaperUrl, answerKeyUrl }: OcrProcessingProps) {
  // Get OCR dialog management functionality
  const ocrDialogs = useOcrDialogs();
  
  // Get OCR status and state setters with refresh support
  const {
    questionOcrText,
    answerOcrText,
    setQuestionOcrText,
    setAnswerOcrText,
    isLoading
  } = useOcrStatus(questionPaperUrl, answerKeyUrl, ocrDialogs.refreshFlag);

  // Get text editor functionality
  const textEditor = useTextEditor({
    questionPaperUrl,
    answerKeyUrl, 
    questionOcrText,
    answerOcrText,
    setQuestionOcrText,
    setAnswerOcrText
  });

  // Get OCR processor functionality
  const ocrProcessor = useOcrProcessor({
    setQuestionOcrText,
    setAnswerOcrText,
    startEditingQuestionText: textEditor.startEditingQuestionText,
    startEditingAnswerText: textEditor.startEditingAnswerText,
    triggerRefresh: ocrDialogs.triggerRefresh
  });

  // Combine all functionality into a single object
  return {
    // OCR states
    questionOcrText,
    answerOcrText,
    loadingOcrQuestion: ocrProcessor.loadingOcrQuestion || isLoading,
    loadingOcrAnswer: ocrProcessor.loadingOcrAnswer || isLoading,
    showOcrQuestionDialog: ocrDialogs.showOcrQuestionDialog,
    showOcrAnswerDialog: ocrDialogs.showOcrAnswerDialog,
    
    // Text editing states
    editingQuestionText: textEditor.editingQuestionText,
    editingAnswerText: textEditor.editingAnswerText,
    newQuestionText: textEditor.newQuestionText,
    newAnswerText: textEditor.newAnswerText,
    savingQuestionText: textEditor.savingQuestionText,
    savingAnswerText: textEditor.savingAnswerText,
    
    // Setters
    setShowOcrQuestionDialog: ocrDialogs.setShowOcrQuestionDialog,
    setShowOcrAnswerDialog: ocrDialogs.setShowOcrAnswerDialog,
    setEditingQuestionText: textEditor.setEditingQuestionText,
    setEditingAnswerText: textEditor.setEditingAnswerText,
    setNewQuestionText: textEditor.setNewQuestionText,
    setNewAnswerText: textEditor.setNewAnswerText,
    
    // Actions
    processOcr: ocrProcessor.processOcr,
    startEditingQuestionText: textEditor.startEditingQuestionText,
    startEditingAnswerText: textEditor.startEditingAnswerText,
    handleSaveQuestionText: textEditor.handleSaveQuestionText,
    handleSaveAnswerText: textEditor.handleSaveAnswerText,
    triggerRefresh: ocrDialogs.triggerRefresh
  };
}
