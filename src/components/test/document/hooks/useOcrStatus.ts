
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to check if OCR text exists for documents in the database
 */
export function useOcrStatus(questionPaperUrl: string, answerKeyUrl: string) {
  const [questionOcrText, setQuestionOcrText] = useState<string | null>(null);
  const [answerOcrText, setAnswerOcrText] = useState<string | null>(null);

  // Check if OCR text exists in storage or cache
  const checkOcrStatus = async () => {
    try {
      // Check if question paper OCR text exists
      const questionResponse = await supabase
        .from('subject_documents')
        .select('ocr_text')
        .eq('document_url', questionPaperUrl)
        .single();

      if (questionResponse.data && questionResponse.data.ocr_text) {
        setQuestionOcrText(questionResponse.data.ocr_text);
      }

      // Check if answer key OCR text exists
      const answerResponse = await supabase
        .from('subject_documents')
        .select('ocr_text')
        .eq('document_url', answerKeyUrl)
        .single();

      if (answerResponse.data && answerResponse.data.ocr_text) {
        setAnswerOcrText(answerResponse.data.ocr_text);
      }
    } catch (error) {
      console.error("Error checking OCR status:", error);
    }
  };

  useEffect(() => {
    if (questionPaperUrl && answerKeyUrl) {
      checkOcrStatus();
    }
  }, [questionPaperUrl, answerKeyUrl]);

  return {
    questionOcrText,
    answerOcrText,
    setQuestionOcrText,
    setAnswerOcrText
  };
}
