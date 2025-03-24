
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { fetchExistingAssessments } from "@/utils/assessment/assessmentManager";

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

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
      const assessments = await fetchExistingAssessments(studentId, subjectId, testId);
      
      if (assessments && assessments.length > 0 && assessments[0].answer_sheet_url) {
        setAnswerSheetUrl(assessments[0].answer_sheet_url);
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
      const event = new CustomEvent('openFileUpload', { detail: { studentId, subjectId, testId } });
      document.dispatchEvent(event);
    }
  };

  const uploadFile = async (file: File): Promise<UploadResult> => {
    try {
      setIsUploading(true);
      
      // Generate a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${studentId}_${uuidv4()}.${fileExt}`;
      const filePath = `answer_sheets/${fileName}`;
      
      // Upload the file to Supabase storage
      const { error: uploadError, data } = await supabase.storage
        .from('files')
        .upload(filePath, file);
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get the public URL
      const { data: urlData } = await supabase.storage
        .from('files')
        .getPublicUrl(filePath);
      
      return { success: true, url: urlData.publicUrl };
    } catch (error: any) {
      console.error("Error uploading file:", error);
      return { success: false, error: error.message || "Failed to upload file" };
    } finally {
      setIsUploading(false);
    }
  };

  const saveAssessmentRecord = async (url: string) => {
    try {
      // Check for existing assessment
      const assessments = await fetchExistingAssessments(studentId, subjectId, testId);
      
      const assessmentData = {
        student_id: studentId,
        subject_id: subjectId,
        test_id: testId,
        answer_sheet_url: url,
        status: 'submitted',
        updated_at: new Date().toISOString()
      };
      
      if (assessments && assessments.length > 0) {
        // Update existing record
        const { error } = await supabase
          .from('assessments')
          .update(assessmentData)
          .eq('id', assessments[0].id);
        
        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('assessments')
          .insert({
            ...assessmentData,
            created_at: new Date().toISOString()
          });
        
        if (error) throw error;
      }
      
      // Update UI state
      setAnswerSheetUrl(url);
      setHasAnswerSheet(true);
      
      // Dispatch event for other components to listen
      const event = new CustomEvent('answerSheetUploaded', { 
        detail: { studentId, subjectId, testId, url } 
      });
      document.dispatchEvent(event);
    } catch (error: any) {
      console.error("Error saving assessment record:", error);
      throw new Error(error.message || "Failed to save assessment record");
    }
  };

  const handleFileSelected = async (file: File) => {
    try {
      const result = await uploadFile(file);
      
      if (!result.success || !result.url) {
        toast.error(result.error || "Failed to upload file");
        return;
      }
      
      await saveAssessmentRecord(result.url);
      toast.success("Answer sheet uploaded successfully");
    } catch (error: any) {
      toast.error(error.message || "Error uploading answer sheet");
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
