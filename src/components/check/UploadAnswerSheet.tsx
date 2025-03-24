
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { 
  validatePdfFile, 
  uploadAnswerSheetFile 
} from "@/utils/assessment/fileUploadUtils";
import { supabase } from "@/integrations/supabase/client";

interface UploadAnswerSheetProps {
  studentId: string;
  selectedSubject: string;
  isEvaluating: boolean;
  testId?: string;
}

export function UploadAnswerSheet({ 
  studentId, 
  selectedSubject,
  isEvaluating,
  testId
}: UploadAnswerSheetProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!validatePdfFile(selectedFile)) {
        toast.error('Please upload PDF files only');
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleUpload = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setIsProcessing(true);
    
    try {
      // Show processing toast
      toast.info('Processing PDF file...');
      
      // Check for existing assessments - using newly created 'assessments' table
      const { data: existingData, error: existingError } = await supabase
        .from('assessments')
        .select('id, answer_sheet_url')
        .eq('student_id', studentId)
        .eq('subject_id', selectedSubject)
        .maybeSingle();
      
      if (existingError && existingError.code !== 'PGRST116') {
        console.error('Error checking existing assessments:', existingError);
        throw new Error('Failed to check existing assessments');
      }
      
      // Extract previous URL for cleanup later
      const previousUrl = existingData?.answer_sheet_url || null;
      
      // Upload the file to storage
      const { publicUrl } = await uploadAnswerSheetFile(file);

      // Prepare the assessment data
      const assessmentData = {
        student_id: studentId,
        subject_id: selectedSubject,
        answer_sheet_url: publicUrl,
        status: 'pending',
        updated_at: new Date().toISOString(),
        text_content: 'Uploaded document'
      } as any;
      
      if (testId) {
        assessmentData.test_id = testId;
      }

      // Update or create assessment
      if (existingData?.id) {
        // Update existing assessment
        const { error: updateError } = await supabase
          .from('assessments')
          .update(assessmentData)
          .eq('id', existingData.id);
        
        if (updateError) throw updateError;
      } else {
        // Create a new assessment
        const { error: insertError } = await supabase
          .from('assessments')
          .insert({
            ...assessmentData,
            created_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
      }
      
      // Reset form
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast.success('Answer sheet uploaded successfully');
      
      // Dispatch event to notify other components
      const customEvent = new CustomEvent('answerSheetUploaded', {
        detail: { studentId, subjectId: selectedSubject, testId }
      });
      document.dispatchEvent(customEvent);
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload answer sheet');
      console.error('Error uploading answer sheet:', error);
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Input
        type="file"
        id={`file-${studentId}`}
        accept=".pdf"
        onChange={handleFileChange}
        className="max-w-sm"
        disabled={isEvaluating || isUploading}
        ref={fileInputRef}
      />
      <Button 
        size="sm" 
        onClick={handleUpload}
        disabled={!file || isUploading || isEvaluating}
        type="button"
      >
        {isUploading ? (
          <div className="flex items-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isProcessing ? "Processing..." : "Uploading..."}
          </div>
        ) : (
          <>
            <FilePlus className="mr-2 h-4 w-4" />
            Upload
          </>
        )}
      </Button>
    </div>
  );
}
