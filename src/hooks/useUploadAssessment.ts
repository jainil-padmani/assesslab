
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  uploadAnswerSheetFile, 
  saveTestAnswer,
  getAnswerSheetUrl
} from "@/utils/assessment/fileUploadUtils";

export function useUploadAssessment(studentId: string, subjectId: string, testId: string, refreshKey?: number) {
  const [isUploading, setIsUploading] = useState(false);
  const [answerSheetUrl, setAnswerSheetUrl] = useState<string | null>(null);
  const [hasAnswerSheet, setHasAnswerSheet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Check for existing answer sheet on mount or when dependencies change
  useEffect(() => {
    if (studentId && subjectId && testId) {
      checkExistingAnswerSheet();
    }
  }, [studentId, subjectId, testId, refreshKey]);

  const checkExistingAnswerSheet = async () => {
    try {
      // Use test_answers table
      const url = await getAnswerSheetUrl(studentId, subjectId, testId);
      
      if (url) {
        setAnswerSheetUrl(url);
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
    if (!testId) {
      toast.error("No test selected");
      return null;
    }
    
    try {
      setIsUploading(true);
      
      // Upload the file
      const { publicUrl } = await uploadAnswerSheetFile(file);
      
      // Save to test_answers
      await saveTestAnswer(
        studentId, 
        subjectId, 
        testId, 
        publicUrl,
        "Uploaded document"
      );
      
      // Update UI state
      setAnswerSheetUrl(publicUrl);
      setHasAnswerSheet(true);
      
      toast.success("Answer sheet uploaded successfully");
      
      // Dispatch event for other components to listen
      const event = new CustomEvent('answerSheetUploaded', { 
        detail: { studentId, subjectId, testId, url: publicUrl } 
      });
      document.dispatchEvent(event);
      
      return publicUrl;
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
      console.error("Error uploading file:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Function to manually trigger a refresh of the data
  const refetch = () => {
    checkExistingAnswerSheet();
  };

  return {
    isUploading,
    hasAnswerSheet,
    answerSheetUrl,
    fileInputRef,
    openFileUpload,
    handleFileSelected,
    checkExistingAnswerSheet,
    refetch
  };
}
