
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { 
  validatePdfFile, 
  uploadAnswerSheetFile, 
  deletePreviousFiles, 
  extractTextFromPdf,
  processPdfFile
} from "@/utils/assessment/fileUploadUtils";
import { saveUploadedAnswerSheet } from "@/utils/assessment/testAnswerService";
import { resetEvaluations } from "@/utils/assessment/evaluationReset";

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
      toast.info('Processing PDF file for enhanced OCR...');
      
      // Process the file for enhanced OCR
      const zipUrl = await processPdfFile(file, 'student');
      
      // Extract text content (this now returns info about the processed ZIP)
      const textContent = await extractTextFromPdf(file);
      
      // Upload the original PDF file to storage
      const { publicUrl } = await uploadAnswerSheetFile(file, textContent);

      // Save the answer sheet information
      if (testId) {
        const success = await saveUploadedAnswerSheet(
          studentId, 
          testId, 
          selectedSubject, 
          publicUrl, 
          textContent
        );
        
        if (!success) {
          throw new Error('Failed to save answer sheet information');
        }
      }
      
      // Reset form
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast.success('Answer sheet uploaded and processed for OCR');
      
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
