import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { processPdfToZip } from "@/utils/assessment/pdfProcessingUtils";

interface OcrProcessingProps {
  questionPaperUrl: string;
  answerKeyUrl: string;
}

export function useOcrProcessing({ questionPaperUrl, answerKeyUrl }: OcrProcessingProps) {
  const [loadingOcrQuestion, setLoadingOcrQuestion] = useState(false);
  const [loadingOcrAnswer, setLoadingOcrAnswer] = useState(false);
  const [questionOcrText, setQuestionOcrText] = useState<string | null>(null);
  const [answerOcrText, setAnswerOcrText] = useState<string | null>(null);
  const [showOcrQuestionDialog, setShowOcrQuestionDialog] = useState(false);
  const [showOcrAnswerDialog, setShowOcrAnswerDialog] = useState(false);
  
  // States for direct text entry
  const [editingQuestionText, setEditingQuestionText] = useState(false);
  const [editingAnswerText, setEditingAnswerText] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newAnswerText, setNewAnswerText] = useState("");
  const [savingQuestionText, setSavingQuestionText] = useState(false);
  const [savingAnswerText, setSavingAnswerText] = useState(false);

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
            setEditingQuestionText(true);
            setLoadingOcrQuestion(false);
          } else {
            setEditingAnswerText(true);
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
    // OCR states
    questionOcrText,
    answerOcrText,
    loadingOcrQuestion,
    loadingOcrAnswer,
    showOcrQuestionDialog,
    showOcrAnswerDialog,
    
    // Text editing states
    editingQuestionText,
    editingAnswerText,
    newQuestionText,
    newAnswerText,
    savingQuestionText,
    savingAnswerText,
    
    // Setters
    setShowOcrQuestionDialog,
    setShowOcrAnswerDialog,
    setEditingQuestionText,
    setEditingAnswerText,
    setNewQuestionText,
    setNewAnswerText,
    
    // Actions
    processOcr,
    startEditingQuestionText,
    startEditingAnswerText,
    handleSaveQuestionText,
    handleSaveAnswerText
  };
}
