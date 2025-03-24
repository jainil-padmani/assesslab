
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { 
  uploadAnswerSheetFile,
  saveTestAnswer 
} from "@/utils/assessment/fileUploadUtils";

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
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Please upload PDF, PNG, or JPG files only');
      return;
    }
    
    setFile(selectedFile);
    
    // Auto-upload as soon as file is selected
    setIsUploading(true);
    setIsProcessing(true);
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
      setFile(null);
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
      setIsProcessing(false);
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
