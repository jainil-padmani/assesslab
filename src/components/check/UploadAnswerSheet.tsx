
import { useState } from "react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { saveTestAnswer } from "@/utils/assessment/fileUploadUtils";

interface UploadAnswerSheetProps {
  studentId: string;
  selectedSubject: string;
  testId: string;
  isEvaluating?: boolean;
  onUploadComplete?: () => void;
}

export function UploadAnswerSheet({
  studentId,
  selectedSubject,
  testId,
  isEvaluating = false,
  onUploadComplete
}: UploadAnswerSheetProps) {
  const [uploading, setUploading] = useState(false);
  const { uploadFile, isUploading, progress } = useFileUpload();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      
      console.log(`Uploading answer sheet for student ${studentId}, subject ${selectedSubject}, test ${testId}`);
      
      // Upload file
      const result = await uploadFile(file, {
        bucketName: 'files',
        folder: 'answer_sheets',
        fileTypes: ['.pdf', '.jpg', '.jpeg', '.png'],
        maxSizeMB: 50,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.url) {
        throw new Error('Failed to get file URL');
      }

      // Save answer sheet information to database
      const success = await saveTestAnswer({
        studentId,
        testId,
        subjectId: selectedSubject,
        answerSheetUrl: result.url,
        zipUrl: result.zipUrl,
        textContent: result.textContent
      });

      if (!success) {
        throw new Error('Failed to save answer sheet information');
      }

      // Show success message
      toast.success('Answer sheet uploaded successfully');
      
      // Dispatch custom event to notify other components
      const event = new CustomEvent('answerSheetUploaded', { 
        detail: { studentId, testId, subjectId: selectedSubject } 
      });
      document.dispatchEvent(event);
      
      // Clear the input file
      e.target.value = '';
      
      // Call the callback if provided
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error: any) {
      console.error('Error uploading answer sheet:', error);
      toast.error(`Upload failed: ${error.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        id={`answer-sheet-${studentId}`}
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.jpg,.jpeg,.png"
        disabled={uploading || isUploading || isEvaluating}
      />
      <label
        htmlFor={`answer-sheet-${studentId}`}
        className={`flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          uploading || isUploading ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {uploading || isUploading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Uploading... {progress.toFixed(0)}%</span>
          </>
        ) : (
          <>
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Sheet</span>
          </>
        )}
      </label>
    </div>
  );
}
