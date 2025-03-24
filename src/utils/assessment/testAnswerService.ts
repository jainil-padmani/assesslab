
import { supabase } from "@/integrations/supabase/client";
import { TestAnswer } from "@/types/assessments";
import { resetEvaluations } from "./evaluationReset";
import { toast } from "sonner";

// Function to save uploaded answer sheet
export async function saveUploadedAnswerSheet(
  studentId: string,
  testId: string,
  subjectId: string,
  answerSheetUrl: string,
  textContent?: string
): Promise<boolean> {
  try {
    // First, check if test_answers table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'test_answers')
      .maybeSingle();
    
    if (tableError) {
      console.error("Error checking if test_answers table exists:", tableError);
      return false;
    }
    
    let success = false;
    
    if (tableExists) {
      // Check if record already exists
      const { data: existingAnswer, error: existingError } = await supabase
        .from('test_answers')
        .select('id')
        .eq('student_id', studentId)
        .eq('test_id', testId)
        .maybeSingle();
      
      if (existingError && existingError.code !== 'PGRST116') {
        console.error("Error checking for existing answer:", existingError);
        return false;
      }
      
      if (existingAnswer) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('test_answers')
          .update({
            answer_sheet_url: answerSheetUrl,
            text_content: textContent || null
          })
          .eq('id', existingAnswer.id);
        
        if (updateError) {
          console.error("Error updating test answer:", updateError);
          return false;
        }
        
        success = true;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('test_answers')
          .insert({
            student_id: studentId,
            test_id: testId,
            subject_id: subjectId,
            answer_sheet_url: answerSheetUrl,
            text_content: textContent || null
          });
        
        if (insertError) {
          console.error("Error inserting test answer:", insertError);
          return false;
        }
        
        success = true;
      }
    } else {
      // Fallback to storing in assessments_master
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments_master')
        .select('id, options')
        .eq('created_by', studentId)
        .eq('subject_id', subjectId)
        .maybeSingle();
      
      if (assessmentError && assessmentError.code !== 'PGRST116') {
        console.error("Error fetching assessment:", assessmentError);
        return false;
      }
      
      const options = assessment?.options || {};
      if (typeof options !== 'object') {
        console.error("Invalid options format in assessment");
        return false;
      }
      
      const updatedOptions = {
        ...options,
        answerSheetUrl,
        textContent: textContent || null
      };
      
      if (assessment) {
        // Update existing assessment
        const { error: updateError } = await supabase
          .from('assessments_master')
          .update({ options: updatedOptions })
          .eq('id', assessment.id);
        
        if (updateError) {
          console.error("Error updating assessment:", updateError);
          return false;
        }
        
        success = true;
      } else {
        // Create new assessment
        const { error: insertError } = await supabase
          .from('assessments_master')
          .insert({
            created_by: studentId,
            subject_id: subjectId,
            options: updatedOptions,
            title: `Answer for test ${testId}`,
            status: 'draft',
            restrictions: {}
          });
        
        if (insertError) {
          console.error("Error inserting assessment:", insertError);
          return false;
        }
        
        success = true;
      }
    }
    
    if (success) {
      // Reset evaluations
      await resetEvaluations(studentId, subjectId, testId);
      toast.success("Answer sheet uploaded successfully");
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error saving uploaded answer sheet:", error);
    toast.error("Failed to save answer sheet");
    return false;
  }
}

// Function to retrieve answer sheet
export async function getAnswerSheet(
  studentId: string,
  testId: string,
  subjectId: string
): Promise<{ answerSheetUrl?: string; textContent?: string } | null> {
  try {
    // First check test_answers table
    const { data: tableExists, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'test_answers')
      .maybeSingle();
    
    if (tableError) {
      console.error("Error checking if test_answers table exists:", tableError);
      return null;
    }
    
    if (tableExists) {
      // Get from test_answers table
      const { data, error } = await supabase
        .from('test_answers')
        .select('*')
        .eq('student_id', studentId)
        .eq('test_id', testId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error("Error getting test answer:", error);
        return null;
      }
      
      if (data) {
        return {
          answerSheetUrl: data.answer_sheet_url,
          textContent: data.text_content
        };
      }
    }
    
    // Fallback to assessments_master
    const { data, error } = await supabase
      .from('assessments_master')
      .select('options')
      .eq('created_by', studentId)
      .eq('subject_id', subjectId)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      console.error("Error getting assessment:", error);
      return null;
    }
    
    if (data && data.options) {
      const options = data.options;
      return {
        answerSheetUrl: options.answerSheetUrl,
        textContent: options.textContent
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error getting answer sheet:", error);
    return null;
  }
}
