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

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    try {
      const { data: existingAssessment, error: fetchError } = await supabase
        .from('assessments')
        .select('id, answer_sheet_url')
        .eq('student_id', studentId)
        .eq('subject_id', selectedSubject)
        .maybeSingle();
        
      if (fetchError) {
        console.error('Error checking existing assessment:', fetchError);
      }
      
      const previousUrl = existingAssessment?.answer_sheet_url;
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(`answer-sheets/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(`answer-sheets/${fileName}`);

      if (existingAssessment) {
        const { error: updateError } = await supabase
          .from('assessments')
          .update({
            answer_sheet_url: publicUrl,
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAssessment.id);
          
        if (updateError) throw updateError;
        
        toast.success('Answer sheet updated successfully');
        
        if (previousUrl) {
          try {
            const urlPath = new URL(previousUrl).pathname;
            const pathParts = urlPath.split('/');
            const oldFileName = pathParts[pathParts.length - 1];
            
            if (oldFileName) {
              await supabase.storage
                .from('documents')
                .remove([`answer-sheets/${oldFileName}`]);
              
              console.log('Successfully deleted previous file from storage');
            }
          } catch (deleteError) {
            console.error('Error deleting previous file:', deleteError);
          }
        }
        
        await resetEvaluations(studentId, selectedSubject);
      } else {
        const { error: assessmentError } = await supabase
          .from('assessments')
          .insert({
            student_id: studentId,
            subject_id: selectedSubject,
            answer_sheet_url: publicUrl,
            status: 'pending'
          });

        if (assessmentError) throw assessmentError;
        toast.success('Answer sheet uploaded successfully');
      }
      
      setFile(null);
    } catch (error: any) {
      toast.error(error.message);
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
      
      const testIds = tests.map(test => test.id);
      
      for (const testId of testIds) {
        const { data: evaluations, error: evalFetchError } = await supabase
          .from('paper_evaluations')
          .select('id')
          .eq('student_id', studentId)
          .eq('test_id', testId);
          
        if (evalFetchError) {
          console.error('Error fetching evaluations:', evalFetchError);
          continue;
        }
        
        if (evaluations && evaluations.length > 0) {
          const { error: evalDeleteError } = await supabase
            .from('paper_evaluations')
            .delete()
            .eq('student_id', studentId)
            .eq('test_id', testId);
            
          if (evalDeleteError) {
            console.error('Error deleting evaluations:', evalDeleteError);
          } else {
            console.log(`Reset evaluation for student ${studentId} and test ${testId}`);
          }
        }
        
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
