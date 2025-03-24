
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { resetEvaluations } from "./evaluationReset";
import { checkTableExists } from "./rpcFunctions";

/**
 * Save an uploaded answer sheet
 */
export async function saveUploadedAnswerSheet(
  studentId: string,
  testId: string,
  subjectId: string,
  answerSheetUrl: string,
  textContent?: string
): Promise<boolean> {
  try {
    // Check if test_answers table exists using the RPC function
    const tableExists = await checkTableExists('test_answers');
    
    let success = false;
    
    if (tableExists) {
      // First try to directly use UPSERT which is safer than checking and then inserting
      const { error: upsertError } = await supabase
        .from('test_answers')
        .upsert({
          student_id: studentId,
          test_id: testId,
          subject_id: subjectId,
          answer_sheet_url: answerSheetUrl,
          text_content: textContent || null
        }, {
          onConflict: 'student_id,test_id'
        });
      
      if (upsertError) {
        console.error("Error saving test answer:", upsertError);
        return false;
      }
      
      success = true;
    } else {
      // Fallback to storing in assessments_master
      const { data: assessment, error: fetchError } = await supabase
        .from('assessments_master')
        .select('id, options')
        .eq('created_by', studentId)
        .eq('subject_id', subjectId)
        .is('test_id', testId ? testId : null)
        .maybeSingle();
      
      if (fetchError) {
        console.error("Error fetching assessment:", fetchError);
        return false;
      }
      
      const currentOptions = assessment?.options || {};
      const updatedOptions = {
        ...currentOptions,
        answerSheetUrl,
        textContent: textContent || null
      };
      
      if (assessment) {
        // Update existing assessment
        const { error: updateError } = await supabase
          .from('assessments_master')
          .update({ 
            options: updatedOptions,
            test_id: testId
          })
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
            test_id: testId,
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

/**
 * Get an answer sheet by student, test, and subject
 */
export async function getAnswerSheet(
  studentId: string,
  testId: string,
  subjectId: string
): Promise<{ answerSheetUrl?: string; textContent?: string } | null> {
  try {
    // First check if test_answers table exists
    const tableExists = await checkTableExists('test_answers');
    
    if (tableExists) {
      // Get data from the custom RPC function or direct query depending on availability
      try {
        // Try direct query first
        const { data, error } = await supabase
          .from('test_answers')
          .select('answer_sheet_url, text_content')
          .eq('student_id', studentId)
          .eq('test_id', testId)
          .maybeSingle();
        
        if (!error && data) {
          return {
            answerSheetUrl: data.answer_sheet_url,
            textContent: data.text_content
          };
        }
      } catch (err) {
        console.error("Error querying test_answers directly:", err);
      }
    }
    
    // Fallback to assessments_master
    const { data, error } = await supabase
      .from('assessments_master')
      .select('options')
      .eq('created_by', studentId)
      .eq('subject_id', subjectId)
      .is('test_id', testId ? testId : null)
      .maybeSingle();
    
    if (error) {
      console.error("Error getting assessment:", error);
      return null;
    }
    
    if (data && data.options) {
      // Safely access properties
      const options = typeof data.options === 'object' ? data.options : {};
      
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
