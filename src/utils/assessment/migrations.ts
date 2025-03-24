
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Function to check if the model_answer and explanation columns exist
export async function ensureAssessmentColumnsExist() {
  try {
    // Check if model_answer column exists
    const { data: modelAnswerExists, error: modelAnswerError } = await supabase.rpc(
      'check_column_exists',
      { table_name: 'assessment_questions', column_name: 'model_answer' }
    );
    
    if (modelAnswerError) {
      console.error("Error checking if model_answer column exists:", modelAnswerError);
      return;
    }
    
    // Check if explanation column exists
    const { data: explanationExists, error: explanationError } = await supabase.rpc(
      'check_column_exists',
      { table_name: 'assessment_questions', column_name: 'explanation' }
    );
    
    if (explanationError) {
      console.error("Error checking if explanation column exists:", explanationError);
      return;
    }
    
    // Add the model_answer column if it doesn't exist
    if (!modelAnswerExists) {
      const { error: addModelAnswerError } = await supabase.rpc(
        'add_column',
        { 
          table_name: 'assessment_questions', 
          column_name: 'model_answer', 
          column_type: 'text' 
        }
      );
      
      if (addModelAnswerError) {
        console.error("Error adding model_answer column:", addModelAnswerError);
        return;
      }
    }
    
    // Add the explanation column if it doesn't exist
    if (!explanationExists) {
      const { error: addExplanationError } = await supabase.rpc(
        'add_column',
        { 
          table_name: 'assessment_questions', 
          column_name: 'explanation', 
          column_type: 'text' 
        }
      );
      
      if (addExplanationError) {
        console.error("Error adding explanation column:", addExplanationError);
        return;
      }
    }
    
    // Ensure test_answers table exists
    const { data: tableExists, error: tableError } = await supabase.rpc(
      'check_table_exists',
      { table_name: 'test_answers' }
    );
    
    if (tableError) {
      console.error("Error checking if test_answers table exists:", tableError);
      return;
    }
    
    if (!tableExists) {
      // Create test_answers table
      const { error: createTableError } = await supabase.rpc(
        'execute_sql',
        { 
          sql: `
            CREATE TABLE test_answers (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              student_id UUID NOT NULL,
              test_id UUID NOT NULL,
              subject_id UUID NOT NULL,
              answer_sheet_url TEXT,
              text_content TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
          `
        }
      );
      
      if (createTableError) {
        console.error("Error creating test_answers table:", createTableError);
        return;
      }
    }
    
    console.log("Assessment schema migration successful");
  } catch (error) {
    console.error("Error ensuring assessment columns exist:", error);
    toast.error("Error updating assessment schema");
  }
}
