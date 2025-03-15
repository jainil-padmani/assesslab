
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilePlus } from "lucide-react";
import { toast } from "sonner";
import { validatePdfFile, uploadAnswerSheetFile, deletePreviousFiles } from "@/utils/assessment/fileUploadUtils";
import { 
  fetchExistingAssessments, 
  updateAssessment, 
  createAssessment,
  removeDuplicateAssessments
} from "@/utils/assessment/assessmentManager";
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
    try {
      // Fetch existing assessments
      const existingAssessments = await fetchExistingAssessments(studentId, selectedSubject, testId);
      
      // Extract previous URLs for cleanup later
      const previousUrls = existingAssessments.map(assessment => assessment.answer_sheet_url).filter(Boolean) || [];
      
      // Process the file (extract text would normally happen here)
      const textContent = await extractTextFromPdf(file);
      
      // Upload the file to storage
      const { publicUrl } = await uploadAnswerSheetFile(file, textContent);

      // Prepare the assessment data
      const assessmentData = {
        student_id: studentId,
        subject_id: selectedSubject,
        answer_sheet_url: publicUrl,
        status: 'pending',
        updated_at: new Date().toISOString(),
        text_content: textContent
      };
      
      if (testId) {
        Object.assign(assessmentData, { test_id: testId });
      }

      // Update or create assessment
      if (existingAssessments && existingAssessments.length > 0) {
        const primaryAssessmentId = existingAssessments[0].id;
        
        // Update the primary assessment
        await updateAssessment(primaryAssessmentId, assessmentData);
        
        // Remove any duplicate assessments if they exist
        if (existingAssessments.length > 1) {
          const duplicateIds = existingAssessments.slice(1).map(a => a.id);
          await removeDuplicateAssessments(primaryAssessmentId, duplicateIds);
        }
      } else {
        // Create a new assessment
        await createAssessment(assessmentData);
      }
      
      // Delete previous files
      await deletePreviousFiles(previousUrls);
      
      // Reset evaluations and grades
      await resetEvaluations(studentId, selectedSubject, testId);
      
      // Reset form
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
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
        disabled={isEvaluating}
        ref={fileInputRef}
      />
      <Button 
        size="sm" 
        onClick={handleUpload}
        disabled={!file || isUploading || isEvaluating}
        type="button"
      >
        {isUploading ? (
          "Uploading..."
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
