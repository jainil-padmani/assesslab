
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { 
  uploadAnswerSheet,
  convertPdfToZip,
  extractTextFromPdf
} from "@/utils/assessment/fileUploadUtils";
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
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate if file is PDF
      if (selectedFile.type !== 'application/pdf') {
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
      const processingToast = toast.loading('Processing PDF file for enhanced OCR...');
      
      // Fetch existing assessments
      const existingAssessments = await fetchExistingAssessments(studentId, selectedSubject, testId);
      
      // Extract previous URLs for cleanup later
      const previousUrls = existingAssessments.map(assessment => assessment.answer_sheet_url).filter(Boolean) || [];
      
      // Process the file for OCR and upload
      toast.loading('Processing PDF for better OCR...', { id: processingToast });
      
      // Extract text content
      const textContent = await extractTextFromPdf(file);
      
      // Convert PDF to ZIP with images for better OCR
      const zipFile = await convertPdfToZip(file);
      
      // Upload the answer sheet
      const { url, zipUrl } = await uploadAnswerSheet(
        file,
        studentId,
        selectedSubject,
        testId
      );

      // Prepare the assessment data
      const assessmentData = {
        student_id: studentId,
        subject_id: selectedSubject,
        answer_sheet_url: url,
        status: 'pending',
        updated_at: new Date().toISOString(),
        text_content: textContent,
        zip_url: zipUrl // Store the ZIP URL for OCR processing
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
      
      // Reset form
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Complete toast
      toast.success('Answer sheet uploaded and processed for OCR', { id: processingToast });
      
      // Dispatch event to notify other components
      const customEvent = new CustomEvent('answerSheetUploaded', {
        detail: { studentId, subjectId: selectedSubject, testId }
      });
      document.dispatchEvent(customEvent);
      
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message || 'Error processing the answer sheet'}`);
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
