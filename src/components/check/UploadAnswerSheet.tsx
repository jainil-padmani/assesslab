
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadAnswerSheetProps {
  studentId: string;
  selectedSubject: string;
  isEvaluating: boolean;
}

export function UploadAnswerSheet({ 
  studentId, 
  selectedSubject,
  isEvaluating 
}: UploadAnswerSheetProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
    // Prevent default form submission behavior
    e.preventDefault();
    
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    try {
      const { data: existingAssessments, error: fetchError } = await supabase
        .from('assessments')
        .select('id, answer_sheet_url')
        .eq('student_id', studentId)
        .eq('subject_id', selectedSubject);
        
      if (fetchError) {
        console.error('Error checking existing assessments:', fetchError);
        throw fetchError;
      }
      
      // Store previous URLs to delete later
      const previousUrls = existingAssessments?.map(assessment => assessment.answer_sheet_url).filter(Boolean) || [];
      
      // Add timestamp to make the filename unique
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}-${timestamp}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(`answer-sheets/${fileName}`, file);

      if (uploadError) throw uploadError;

      // Get public URL and add cache busting parameter
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(`answer-sheets/${fileName}`);
      
      // Add cache busting parameter to URL
      const cacheBustedUrl = `${publicUrl}?t=${timestamp}`;

      if (existingAssessments && existingAssessments.length > 0) {
        const primaryAssessmentId = existingAssessments[0].id;
        
        const { error: updateError } = await supabase
          .from('assessments')
          .update({
            answer_sheet_url: cacheBustedUrl,
            status: 'pending',
            updated_at: new Date().toISOString()
          })
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
            student_id: studentId,
            subject_id: selectedSubject,
            answer_sheet_url: cacheBustedUrl,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (assessmentError) throw assessmentError;
        toast.success('Answer sheet uploaded successfully');
      }
      
      // Delete previous files from storage
      for (const prevUrl of previousUrls) {
        try {
          if (prevUrl) {
            const urlPath = new URL(prevUrl).pathname;
            const pathParts = urlPath.split('/');
            const oldFileName = pathParts[pathParts.length - 1];
            
            if (oldFileName) {
              // Remove any query parameters from the filename
              const cleanFileName = oldFileName.split('?')[0];
              
              await supabase.storage
                .from('documents')
                .remove([`answer-sheets/${cleanFileName}`]);
              
              console.log('Successfully deleted previous file from storage:', cleanFileName);
            }
          }
        } catch (deleteError) {
          console.error('Error deleting previous file:', deleteError);
        }
      }
      
      // Reset evaluations and grades
      await resetEvaluations(studentId, selectedSubject);
      
      // Clear the file input and state
      setFile(null);
      
      // Clear the file input
      const fileInput = document.getElementById(`file-${studentId}`) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      // Refresh evaluations without full page reload
      window.dispatchEvent(new CustomEvent('refreshEvaluations'));
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload answer sheet');
      console.error('Error uploading answer sheet:', error);
    } finally {
      setIsUploading(false);
    }
  };
  
  const resetEvaluations = async (studentId: string, subjectId: string) => {
    try {
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
      
      // Delete all existing evaluations for this student and subject tests
      const { error: evalDeleteError } = await supabase
        .from('paper_evaluations')
        .delete()
        .eq('student_id', studentId)
        .in('test_id', testIds);
        
      if (evalDeleteError) {
        console.error('Error deleting evaluations:', evalDeleteError);
      } else {
        console.log(`Reset evaluations for student ${studentId} across all tests`);
      }
      
      // Reset grades for each test
      for (const testId of testIds) {
        const { data: grades, error: gradesFetchError } = await supabase
          .from('test_grades')
          .select('id')
          .eq('student_id', studentId)
          .eq('test_id', testId);
          
        if (gradesFetchError) {
          console.error('Error fetching grades:', gradesFetchError);
          continue;
        }
        
        if (grades && grades.length > 0) {
          const { error: gradesUpdateError } = await supabase
            .from('test_grades')
            .update({
              marks: 0,
              remarks: 'Reset due to answer sheet reupload'
            })
            .eq('student_id', studentId)
            .eq('test_id', testId);
            
          if (gradesUpdateError) {
            console.error('Error updating grades:', gradesUpdateError);
          } else {
            console.log(`Reset grades for student ${studentId} and test ${testId}`);
          }
        }
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
      />
      <Button 
        size="sm" 
        onClick={handleUpload}
        disabled={!file || isUploading || isEvaluating}
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
