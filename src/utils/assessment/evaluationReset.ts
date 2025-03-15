
import { supabase } from "@/integrations/supabase/client";

/**
 * Reset evaluations and grades when a new answer sheet is uploaded
 */
export const resetEvaluations = async (studentId: string, subjectId: string, testId?: string) => {
  try {
    // Reset paper evaluations
    await resetPaperEvaluations(studentId, subjectId, testId);
    
    // Reset test grades
    await resetTestGrades(studentId, subjectId, testId);
  } catch (error) {
    console.error('Error resetting evaluations and grades:', error);
  }
};

/**
 * Reset paper evaluations for a student
 */
const resetPaperEvaluations = async (studentId: string, subjectId: string, testId?: string) => {
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
  } catch (error) {
    console.error('Error resetting paper evaluations:', error);
  }
};

/**
 * Reset test grades for a student
 */
const resetTestGrades = async (studentId: string, subjectId: string, testId?: string) => {
  try {
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
    console.error('Error resetting test grades:', error);
  }
};
