
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkTableExists } from "./rpcFunctions";

// Function to check if the model_answer and explanation columns exist
export async function ensureAssessmentColumnsExist() {
  try {
    // Check if model_answer column exists with client-side function
    const { data: modelAnswerExists, error: modelAnswerError } = await supabase.rpc(
      'check_column_exists',
      { 
        table_name_param: 'assessment_questions', 
        column_name_param: 'model_answer' 
      }
    );
    
    if (modelAnswerError) {
      console.error("Error checking if model_answer column exists:", modelAnswerError);
      return false;
    }
    
    // Check if explanation column exists
    const { data: explanationExists, error: explanationError } = await supabase.rpc(
      'check_column_exists',
      { 
        table_name_param: 'assessment_questions', 
        column_name_param: 'explanation' 
      }
    );
    
    if (explanationError) {
      console.error("Error checking if explanation column exists:", explanationError);
      return false;
    }
    
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
      // Create test_answers table using RPC function
      const { error: createTableError } = await supabase.rpc(
        'create_test_answers_table'
      );
      
      if (createTableError) {
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
