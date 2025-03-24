
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { 
  uploadAnswerSheetFile,
  saveTestAnswer 
} from "@/utils/assessment/fileUploadUtils";
import { validateFileFormat } from "@/utils/assessment/fileValidation";

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
  const [isUploading, setIsUploading] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    if (!testId) {
      toast.error('No test selected');
      return;
    }
    
    // Valid file types: PDF, PNG, JPG
    if (!validateFileFormat(selectedFile)) {
      toast.error('Please upload PDF, PNG, or JPG files only');
      return;
    }
    
    // Auto-upload as soon as file is selected
    setIsUploading(true);
    setProcessingStep("Uploading file...");
    
    try {
      // Show processing toast
      toast.info('Processing file...');
      
      // Upload the file to storage
      setProcessingStep("Converting file...");
      const { publicUrl, zipUrl } = await uploadAnswerSheetFile(selectedFile, studentId);
      
      setProcessingStep("Saving to database...");
      // Save to test_answers table
      await saveTestAnswer(
        studentId,
        selectedSubject,
        testId,
        publicUrl,
        selectedFile.type === 'application/pdf' ? 'PDF uploaded - awaiting OCR extraction' : 'Image uploaded',
        zipUrl
      );
      
      // Reset form
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast.success('Answer sheet uploaded successfully');
      
      // Dispatch event to notify other components
      const customEvent = new CustomEvent('answerSheetUploaded', {
        detail: { studentId, subjectId: selectedSubject, testId, zipUrl }
      });
      document.dispatchEvent(customEvent);
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload answer sheet');
      console.error('Error uploading answer sheet:', error);
    } finally {
      setIsUploading(false);
      setProcessingStep("");
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Input
        type="file"
        id={`file-${studentId}`}
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={handleFileChange}
        className="max-w-sm"
        disabled={isEvaluating || isUploading}
        ref={fileInputRef}
      />
      {isUploading && (
        <div className="flex items-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {processingStep || "Processing..."}
        </div>
      )}
    </div>
  );
}
