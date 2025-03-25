
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { processPdfToZip } from "@/utils/assessment/pdfProcessingUtils";

interface OcrProcessingFunctions {
  setQuestionOcrText: (text: string | null) => void;
  setAnswerOcrText: (text: string | null) => void;
  startEditingQuestionText: () => void;
  startEditingAnswerText: () => void;
}

/**
 * Hook to handle OCR processing of document files
 */
export function useOcrProcessor({
  setQuestionOcrText,
  setAnswerOcrText,
  startEditingQuestionText,
  startEditingAnswerText
}: OcrProcessingFunctions) {
  const [loadingOcrQuestion, setLoadingOcrQuestion] = useState(false);
  const [loadingOcrAnswer, setLoadingOcrAnswer] = useState(false);

  /**
   * Process OCR for a file
   */
  const processOcr = async (fileUrl: string, fileType: string) => {
    try {
      // Set loading state based on file type
      if (fileType === 'question') {
        setLoadingOcrQuestion(true);
      } else {
        setLoadingOcrAnswer(true);
      }

      // Extract file name from URL for logging
      const fileName = fileUrl.split('/').pop() || 'unknown';
      
      // Check if the file is a PDF (based on URL)
      const isPdf = fileName.toLowerCase().endsWith('.pdf');
      let zipUrl = null;
      
      if (isPdf) {
        try {
          // Fetch the PDF file
          const fileResponse = await fetch(fileUrl);
          if (!fileResponse.ok) {
            throw new Error(`Failed to fetch PDF: ${fileResponse.statusText}`);
          }
          
          const pdfBlob = await fileResponse.blob();
          const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
          
          // Generate a unique identifier for this file
          const fileIdentifier = fileUrl.substring(fileUrl.lastIndexOf('/') + 1, fileUrl.lastIndexOf('.'));
          
          // Process the PDF to create a ZIP file with PNG images
          const result = await processPdfToZip(pdfFile, fileIdentifier, `${fileType}_papers`);
          zipUrl = result.zipUrl;
          
          console.log(`PDF processed, ZIP URL: ${zipUrl}`);
          toast.info('PDF converted to images for better OCR processing.');
        } catch (pdfError) {
          console.error("Error processing PDF:", pdfError);
          toast.error("Failed to process PDF. Using manual text entry instead.");
          
          // If PDF processing fails, switch to manual entry
          if (fileType === 'question') {
            startEditingQuestionText();
            setLoadingOcrQuestion(false);
          } else {
            startEditingAnswerText();
            setLoadingOcrAnswer(false);
          }
          return;
        }
      }
      
      // Call the extract-text function to process the file
      const response = await supabase.functions.invoke('extract-text', {
        body: {
          fileUrl,
          fileName,
          fileType: fileType === 'question' ? 'questionPaper' : 'answerKey',
          zipUrl: zipUrl // Pass the ZIP URL if available (for PDF files)
        }
      });

      // Check if the edge function returned an error
      if (response.error) {
        throw new Error(response.error.message || 'Failed to process OCR');
      }

      // Check if the response indicates a PDF file that can't be directly processed
      if (response.data?.is_pdf && !zipUrl) {
        toast.info('PDF files require conversion to images. Please wait...');
        return;
      }

      const extractedText = response.data?.text;
      
      if (!extractedText) {
        throw new Error('No text extracted from document');
      }

      // Store the OCR text in database
      const updateResponse = await supabase
        .from('subject_documents')
        .update({ ocr_text: extractedText })
        .eq('document_url', fileUrl);

      if (updateResponse.error) {
        console.error("Error storing OCR text:", updateResponse.error);
      }

      // Update state with extracted text
      if (fileType === 'question') {
        setQuestionOcrText(extractedText);
        toast.success('Question paper OCR processing completed');
      } else {
        setAnswerOcrText(extractedText);
        toast.success('Answer key OCR processing completed');
      }

    } catch (error) {
      console.error(`Error processing ${fileType} OCR:`, error);
      toast.error(`Failed to process ${fileType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Suggest manual text entry when OCR fails
      if (fileType === 'question') {
        toast.info('Try entering the text manually instead');
      } else if (fileType === 'answer') {
        toast.info('Try entering the text manually instead');
      }
    } finally {
      // Reset loading state
      if (fileType === 'question') {
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
