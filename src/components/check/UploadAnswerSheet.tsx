import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    try {
      let query = supabase
        .from('assessments')
        .select('id, answer_sheet_url');
      
      query = query.eq('student_id', studentId).eq('subject_id', selectedSubject);
      
      if (testId) {
        query = query.eq('test_id', testId);
      }
      
      const { data: existingAssessments, error: fetchError } = await query;
      
      if (fetchError) {
        console.error('Error checking existing assessments:', fetchError);
        throw fetchError;
      }
      
      const previousUrls = existingAssessments?.map(assessment => assessment.answer_sheet_url).filter(Boolean) || [];
      
      const fileName = `${crypto.randomUUID()}.pdf`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(`answer-sheets/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(`answer-sheets/${fileName}`);

      const assessmentData = {
        student_id: studentId,
        subject_id: selectedSubject,
        answer_sheet_url: publicUrl,
        status: 'pending',
        updated_at: new Date().toISOString()
      };
      
      if (testId) {
        Object.assign(assessmentData, { test_id: testId });
      }

      if (existingAssessments && existingAssessments.length > 0) {
        const primaryAssessmentId = existingAssessments[0].id;
        
        const { error: updateError } = await supabase
          .from('assessments')
          .update(assessmentData)
          .eq('id', primaryAssessmentId);
          
        if (updateError) throw updateError;
        
        if (existingAssessments.length > 1) {
          const duplicateIds = existingAssessments.slice(1).map(a => a.id);
          const { error: deleteError } = await supabase
            .from('assessments')
            .delete()
            .in('id', duplicateIds);
            
          if (deleteError) {
            console.error('Error removing duplicate assessments:', deleteError);
          } else {
            console.log(`Removed ${duplicateIds.length} duplicate assessment(s)`);
          }
        }
        
        toast.success('Answer sheet updated successfully');
      } else {
        const { error: assessmentError } = await supabase
          .from('assessments')
          .insert({
            ...assessmentData,
            created_at: new Date().toISOString()
          });

        if (assessmentError) throw assessmentError;
        toast.success('Answer sheet uploaded successfully');
      }
      
      for (const prevUrl of previousUrls) {
        try {
          if (prevUrl) {
            const urlPath = new URL(prevUrl).pathname;
            const pathParts = urlPath.split('/');
            const oldFileName = pathParts[pathParts.length - 1];
            
            if (oldFileName) {
              await supabase.storage
                .from('documents')
                .remove([`answer-sheets/${oldFileName}`]);
              
              console.log('Successfully deleted previous file from storage:', oldFileName);
            }
          }
        } catch (deleteError) {
          console.error('Error deleting previous file:', deleteError);
        }
      }
      
      await resetEvaluations(studentId, selectedSubject, testId);
      
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
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
  
  const resetEvaluations = async (studentId: string, subjectId: string, testId?: string) => {
    try {
      let query = supabase
        .from('paper_evaluations')
        .delete()
        .eq('student_id', studentId);
      
      if (testId) {
        query = query.eq('test_id', testId);
        console.log(`Resetting evaluations for student ${studentId} for test ${testId}`);
      } else {
        const { data: tests, error: testsError } = await supabase
          .from('tests')
          .select('id')
          .eq('subject_id', subjectId);
          
        if (testsError) {
          console.error('Error fetching tests:', testsError);
          return;
        }
        
        if (!tests || tests.length === 0) return;
        
        console.log(`Resetting evaluations for student ${studentId} across ${tests.length} tests`);
        
        const testIds = tests.map(test => test.id);
        query = query.in('test_id', testIds);
      }
      
      const { error: evalDeleteError } = await query;
          
      if (evalDeleteError) {
        console.error('Error deleting evaluations:', evalDeleteError);
      } else {
        console.log(`Reset evaluations for student ${studentId}`);
      }
      
      let gradesQuery = supabase
        .from('test_grades')
        .update({
          marks: 0,
          remarks: 'Reset due to answer sheet reupload'
        })
        .eq('student_id', studentId);
        
      if (testId) {
        gradesQuery = gradesQuery.eq('test_id', testId);
      } else if (subjectId) {
        const { data: tests } = await supabase
          .from('tests')
          .select('id')
          .eq('subject_id', subjectId);
          
        if (tests && tests.length > 0) {
          const testIds = tests.map(test => test.id);
          gradesQuery = gradesQuery.in('test_id', testIds);
        }
      }
      
      const { error: gradesUpdateError } = await gradesQuery;
          
      if (gradesUpdateError) {
        console.error('Error updating grades:', gradesUpdateError);
      } else {
        console.log(`Reset grades for student ${studentId}`);
      }
    } catch (error) {
      console.error('Error resetting evaluations and grades:', error);
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
