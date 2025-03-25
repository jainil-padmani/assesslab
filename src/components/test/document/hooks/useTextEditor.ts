
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TextEditorOptions {
  questionPaperUrl: string;
  answerKeyUrl: string;
  questionOcrText: string | null;
  answerOcrText: string | null;
  setQuestionOcrText: (text: string | null) => void;
  setAnswerOcrText: (text: string | null) => void;
}

/**
 * Hook to manage text editing functionality for OCR content
 */
export function useTextEditor({
  questionPaperUrl,
  answerKeyUrl,
  questionOcrText,
  answerOcrText,
  setQuestionOcrText,
  setAnswerOcrText
}: TextEditorOptions) {
  // States for direct text entry
  const [editingQuestionText, setEditingQuestionText] = useState(false);
  const [editingAnswerText, setEditingAnswerText] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newAnswerText, setNewAnswerText] = useState("");
  const [savingQuestionText, setSavingQuestionText] = useState(false);
  const [savingAnswerText, setSavingAnswerText] = useState(false);

  const startEditingQuestionText = () => {
    setNewQuestionText(questionOcrText || '');
    setEditingQuestionText(true);
  };

  const startEditingAnswerText = () => {
    setNewAnswerText(answerOcrText || '');
    setEditingAnswerText(true);
  };

  const handleSaveQuestionText = async () => {
    if (!newQuestionText.trim()) {
      toast.error('Please enter some text for the question paper');
      return;
    }

    try {
      setSavingQuestionText(true);
      
      // Check if document record exists
      const { data: existingDoc, error: checkError } = await supabase
        .from('subject_documents')
        .select('id')
        .eq('document_url', questionPaperUrl)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingDoc) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('subject_documents')
          .update({ ocr_text: newQuestionText })
          .eq('document_url', questionPaperUrl);

        if (updateError) throw updateError;
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('subject_documents')
          .insert({
            document_url: questionPaperUrl,
            document_type: 'questionPaper',
            file_name: questionPaperUrl.split('/').pop() || 'manual-entry',
            file_type: 'text/plain',
            file_size: newQuestionText.length,
            ocr_text: newQuestionText
          });

        if (insertError) throw insertError;
      }

      // Update local state
      setQuestionOcrText(newQuestionText);
      setEditingQuestionText(false);
      toast.success('Question paper text saved successfully');
    } catch (error) {
      console.error('Error saving question text:', error);
      toast.error(`Failed to save question text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSavingQuestionText(false);
    }
  };

  const handleSaveAnswerText = async () => {
    if (!newAnswerText.trim()) {
      toast.error('Please enter some text for the answer key');
      return;
    }

    try {
      setSavingAnswerText(true);
      
      // Check if document record exists
      const { data: existingDoc, error: checkError } = await supabase
        .from('subject_documents')
        .select('id')
        .eq('document_url', answerKeyUrl)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingDoc) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('subject_documents')
          .update({ ocr_text: newAnswerText })
          .eq('document_url', answerKeyUrl);

        if (updateError) throw updateError;
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('subject_documents')
          .insert({
            document_url: answerKeyUrl,
            document_type: 'answerKey',
            file_name: answerKeyUrl.split('/').pop() || 'manual-entry',
            file_type: 'text/plain',
            file_size: newAnswerText.length,
            ocr_text: newAnswerText
          });

        if (insertError) throw insertError;
      }

      // Update local state
      setAnswerOcrText(newAnswerText);
      setEditingAnswerText(false);
      toast.success('Answer key text saved successfully');
    } catch (error) {
      console.error('Error saving answer text:', error);
      toast.error(`Failed to save answer text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSavingAnswerText(false);
    }
  };

  return {
    // Text editing states
    editingQuestionText,
    editingAnswerText,
    newQuestionText,
    newAnswerText,
    savingQuestionText,
    savingAnswerText,
    
    // Setters
    setEditingQuestionText,
    setEditingAnswerText,
    setNewQuestionText,
    setNewAnswerText,
    
    // Actions
    startEditingQuestionText,
    startEditingAnswerText,
    handleSaveQuestionText,
    handleSaveAnswerText
  };
}
