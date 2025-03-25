
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseOcrProcessorProps {
  setQuestionOcrText: (text: string | null) => void;
  setAnswerOcrText: (text: string | null) => void;
  startEditingQuestionText: () => void;
  startEditingAnswerText: () => void;
  triggerRefresh: () => void;
}

/**
 * Hook for managing OCR processing
 */
export function useOcrProcessor({
  setQuestionOcrText,
  setAnswerOcrText,
  startEditingQuestionText,
  startEditingAnswerText,
  triggerRefresh
}: UseOcrProcessorProps) {
  const [loadingOcrQuestion, setLoadingOcrQuestion] = useState(false);
  const [loadingOcrAnswer, setLoadingOcrAnswer] = useState(false);

  const processOcr = async (documentUrl: string, isQuestion: boolean) => {
    if (isQuestion) {
      setLoadingOcrQuestion(true);
    } else {
      setLoadingOcrAnswer(true);
    }

    try {
      const response = await supabase.functions.invoke('extract-text', {
        body: {
          documentUrl,
          isZip: documentUrl.includes('.zip')
        }
      });

      if (response.error) {
        toast.error(`OCR failed: ${response.error.message}`);
        throw new Error(response.error.message);
      }

      const extractedText = response.data?.text;
      
      if (!extractedText) {
        toast.error("OCR process didn't return any text");
        throw new Error("No text extracted");
      }

      // Update the document with OCR text
      const { error: updateError } = await supabase
        .from('subject_documents')
        .update({ ocr_text: extractedText })
        .eq('document_url', documentUrl);

      if (updateError) {
        toast.error(`Failed to save OCR text: ${updateError.message}`);
        throw updateError;
      }

      if (isQuestion) {
        setQuestionOcrText(extractedText);
        startEditingQuestionText();
        toast.success("Question paper OCR completed");
      } else {
        setAnswerOcrText(extractedText);
        startEditingAnswerText();
        toast.success("Answer key OCR completed");
      }
      
      // Trigger a refresh after successful OCR
      triggerRefresh();

    } catch (error) {
      console.error("OCR processing error:", error);
      toast.error(`OCR processing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      if (isQuestion) {
        setLoadingOcrQuestion(false);
      } else {
        setLoadingOcrAnswer(false);
      }
    }
  };

  return {
    loadingOcrQuestion,
    loadingOcrAnswer,
    processOcr
  };
}
