
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useUploadAssessment(studentId: string, subjectId: string, testId: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [answerSheetUrl, setAnswerSheetUrl] = useState<string | null>(null);
  const [hasAnswerSheet, setHasAnswerSheet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Check for existing answer sheet on mount or when dependencies change
  useEffect(() => {
    if (studentId && subjectId) {
      checkExistingAnswerSheet();
    }
  }, [studentId, subjectId, testId]);

  const checkExistingAnswerSheet = async () => {
    try {
      // Use assessments table
      const { data, error } = await supabase
        .from('assessments')
        .select('answer_sheet_url')
        .eq('student_id', studentId)
        .eq('subject_id', subjectId)
        .eq('test_id', testId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error("Error checking existing answer sheet:", error);
        return;
      }
      
      if (data && data.answer_sheet_url) {
        setAnswerSheetUrl(data.answer_sheet_url);
        setHasAnswerSheet(true);
      } else {
        setAnswerSheetUrl(null);
        setHasAnswerSheet(false);
      }
    } catch (error) {
      console.error("Error checking existing answer sheet:", error);
    }
  };

  const openFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      // Dispatch a custom event to open the file dialog
      const event = new CustomEvent('openFileUpload', { 
        detail: { studentId, subjectId, testId } 
      });
      document.dispatchEvent(event);
    }
  };

  const handleFileSelected = async (file: File) => {
    try {
      setIsUploading(true);
      
      // Generate a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${studentId}_${Date.now()}.${fileExt}`;
      const filePath = `answer_sheets/${fileName}`;
      
      // Upload the file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file);
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get the public URL
      const { data: urlData } = await supabase.storage
        .from('files')
        .getPublicUrl(filePath);
      
      const url = urlData.publicUrl;
      
      // Check for existing assessment using the new assessments table
      const { data: existingData, error: checkError } = await supabase
        .from('assessments')
        .select('id')
        .eq('student_id', studentId)
        .eq('subject_id', subjectId)
        .eq('test_id', testId)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      // Save or update assessment record
      if (existingData) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('assessments')
          .update({
            answer_sheet_url: url,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData.id);
        
        if (updateError) throw updateError;
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('assessments')
          .insert({
            student_id: studentId,
            subject_id: subjectId,
            test_id: testId,
            answer_sheet_url: url,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (insertError) throw insertError;
      }
      
      // Update UI state
      setAnswerSheetUrl(url);
      setHasAnswerSheet(true);
      
      toast.success("Answer sheet uploaded successfully");
      
      // Dispatch event for other components to listen
      const event = new CustomEvent('answerSheetUploaded', { 
        detail: { studentId, subjectId, testId, url } 
      });
      document.dispatchEvent(event);
      
      return url;
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
      console.error("Error uploading file:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    isUploading,
    hasAnswerSheet,
    answerSheetUrl,
    fileInputRef,
    openFileUpload,
    handleFileSelected,
    checkExistingAnswerSheet
  };
}
