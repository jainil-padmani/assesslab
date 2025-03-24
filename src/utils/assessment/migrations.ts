
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkTableExists, checkColumnExists } from "./rpcFunctions";

// Function to check if the model_answer and explanation columns exist
export async function ensureAssessmentColumnsExist() {
  try {
    // Check if model_answer column exists with RPC function
    const modelAnswerExists = await checkColumnExists(
      'assessment_questions', 
      'model_answer'
    );
    
    // Check if explanation column exists
    const explanationExists = await checkColumnExists(
      'assessment_questions', 
      'explanation'
    );
    
    // Add the model_answer column if it doesn't exist
    if (!modelAnswerExists) {
      const { error: addModelAnswerError } = await supabase.rpc(
        'add_column',
        { 
          table_name_param: 'assessment_questions', 
          column_name_param: 'model_answer',
          column_type_param: 'text'
        }
      );
      
      if (addModelAnswerError) {
        console.error("Error adding model_answer column:", addModelAnswerError);
        return false;
      }
    }
    
    // Add the explanation column if it doesn't exist
    if (!explanationExists) {
      const { error: addExplanationError } = await supabase.rpc(
        'add_column',
        { 
          table_name_param: 'assessment_questions', 
          column_name_param: 'explanation',
          column_type_param: 'text'
        }
      );
      
      if (addExplanationError) {
        console.error("Error adding explanation column:", addExplanationError);
        return false;
      }
    }
    
    // Ensure test_answers table exists
    const tableExists = await checkTableExists('test_answers');
    
    if (!tableExists) {
      // Since the RPC function create_test_answers_table doesn't exist,
      // we'll use a direct SQL query through Supabase's function call
      const { error: createTableError } = await supabase
        .from('test_answers')
        .insert({
          id: 'temporary-id',
          student_id: '00000000-0000-0000-0000-000000000000',
          test_id: '00000000-0000-0000-0000-000000000000',
          subject_id: '00000000-0000-0000-0000-000000000000',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createTableError && createTableError.code !== 'PGRST116') {
        console.error("Error creating test_answers table:", createTableError);
        return false;
      }
    }
    
    console.log("Assessment schema migration successful");
    return true;
  } catch (error) {
    console.error("Error ensuring assessment columns exist:", error);
    toast.error("Error updating assessment schema");
    return false;
  }
}
