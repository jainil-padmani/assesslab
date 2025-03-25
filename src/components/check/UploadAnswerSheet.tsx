
import { useState, useRef } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { 
  uploadAnswerSheetFile,
  saveTestAnswer,
  validateFileFormat 
} from "@/utils/assessment/fileUploadUtils";
import { Button } from "@/components/ui/button";

interface UploadAnswerSheetProps {
  studentId: string;
  selectedSubject: string;
  isEvaluating: boolean;
  testId?: string;
  onUploadComplete?: () => void;
}

export function UploadAnswerSheet({ 
  studentId, 
  selectedSubject,
  isEvaluating,
  testId,
  onUploadComplete
}: UploadAnswerSheetProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    // Check file size - warn if greater than 5MB
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.warning('File is larger than 5MB. This may cause processing issues. Consider using smaller files for better results.');
    }
    
    processFile(selectedFile);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!testId) {
      toast.error('No test selected');
      return;
    }
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      
      if (!validateFileFormat(file)) {
        toast.error('Please upload PDF, PNG, or JPG files only');
        return;
      }
      
      // Check file size - warn if greater than 5MB
      if (file.size > 5 * 1024 * 1024) {
        toast.warning('File is larger than 5MB. This may cause processing issues. Consider using smaller files for better results.');
      }
      
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    // Auto-upload as soon as file is selected
    setIsUploading(true);
    setProcessingStep("Uploading file...");
    
    try {
      // Show processing toast
      toast.info('Processing file for evaluation...');
      
      // Processing step depends on file type
      if (file.type === 'application/pdf') {
        setProcessingStep("Converting PDF to optimized images...");
        
        // For large PDFs, display a more specific message
        if (file.size > 3 * 1024 * 1024) {
          toast.warning('Processing large PDF (>3MB). This may take a moment and could affect OCR quality. Consider using smaller files for better results.');
        }
      } else if (file.type.startsWith('image/')) {
        setProcessingStep("Optimizing image for OCR...");
      }
      
      // Upload the file to storage
      const { publicUrl, zipUrl } = await uploadAnswerSheetFile(file, studentId);
      
      setProcessingStep("Saving to database...");
      // Save to test_answers table
      await saveTestAnswer(
        studentId,
        selectedSubject,
        testId || '',
        publicUrl,
        file.type === 'application/pdf' ? 'PDF converted to optimized format for OCR' : 'Image optimized for OCR',
        zipUrl
      );
      
      // Reset form
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast.success('Answer sheet uploaded and optimized successfully');
      
      // Dispatch event to notify other components
      const customEvent = new CustomEvent('answerSheetUploaded', {
        detail: { studentId, subjectId: selectedSubject, testId, zipUrl }
      });
      document.dispatchEvent(customEvent);
      
      // Call the callback if provided
      if (onUploadComplete) {
        onUploadComplete();
      }

      // Refresh the page to enable evaluate button
      toast.success("Page will refresh to enable evaluation...", {
        duration: 2000
      });
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload answer sheet');
      console.error('Error uploading answer sheet:', error);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsUploading(false);
      setProcessingStep("");
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div 
      className={`relative border-2 border-dashed rounded-lg transition-all duration-200 ${
        isDragging 
          ? 'border-primary bg-primary/5' 
          : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={handleFileChange}
        className="hidden"
        disabled={isEvaluating || isUploading}
      />
      
      <div 
        className="flex flex-col items-center justify-center p-4 cursor-pointer"
        onClick={triggerFileInput}
      >
        <div className="mb-2 rounded-full bg-primary/10 p-2 text-primary">
          <FileUp className="h-5 w-5" />
        </div>
        
        <p className="text-sm font-medium mb-1">
          {isUploading ? 'Processing...' : 'Upload Answer Sheet'}
        </p>
        
        <p className="text-xs text-muted-foreground text-center mb-1">
          Drop your file here or click to browse
        </p>
        
        <p className="text-xs text-muted-foreground text-center">
          PDF, PNG, JPG (max 5MB) - Files will be optimized for OCR
        </p>
        
        {isUploading && (
          <div className="mt-3 w-full max-w-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{processingStep || "Processing..."}</span>
            </div>
            <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
