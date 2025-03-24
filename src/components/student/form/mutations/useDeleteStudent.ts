
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (studentId: string) => {
      // First check for related data that should be deleted
      try {
        // Check for test_grades
        const { data: testGrades, error: testGradesError } = await supabase
          .from('test_grades')
          .select('id')
          .eq('student_id', studentId);
        
        if (testGradesError) throw testGradesError;
        
        if (testGrades && testGrades.length > 0) {
          console.log(`Deleting ${testGrades.length} test grades for student ${studentId}`);
          const { error: deleteGradesError } = await supabase
            .from('test_grades')
            .delete()
            .eq('student_id', studentId);
          
          if (deleteGradesError) throw deleteGradesError;
        }
        
        // Check for test_answers
        try {
          const { data: testAnswers, error: testAnswersError } = await supabase
            .from('test_answers')
            .select('id')
            .eq('student_id', studentId);
          
          if (testAnswersError) {
            throw testAnswersError;
          }
          
          if (testAnswers && testAnswers.length > 0) {
            console.log(`Deleting ${testAnswers.length} test answers for student ${studentId}`);
            const { error: deleteTestAnswersError } = await supabase
              .from('test_answers')
              .delete()
              .eq('student_id', studentId);
            
            if (deleteTestAnswersError) {
              throw deleteTestAnswersError;
            }
          }
        } catch (error: any) {
          console.error('Error checking/deleting test answers:', error);
        }
        
        // Check for paper_evaluations
        const { data: evaluations, error: evaluationsError } = await supabase
          .from('paper_evaluations')
          .select('id')
          .eq('student_id', studentId);
        
        if (evaluationsError) throw evaluationsError;
        
        if (evaluations && evaluations.length > 0) {
          console.log(`Deleting ${evaluations.length} evaluations for student ${studentId}`);
          const { error: deleteEvaluationsError } = await supabase
            .from('paper_evaluations')
            .delete()
            .eq('student_id', studentId);
          
          if (deleteEvaluationsError) throw deleteEvaluationsError;
        }
        
        // Finally, delete the student
        const { error } = await supabase
          .from('students')
          .delete()
          .eq('id', studentId);
        
        if (error) throw error;
        
        return studentId;
      } catch (error: any) {
        console.error('Error deleting student:', error);
        throw new Error(`Failed to delete student: ${error.message}`);
      }
    },
    onSuccess: (_, studentId) => {
      toast.success('Student deleted successfully');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      // Navigate back to students list
      navigate('/dashboard/students');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });
}
