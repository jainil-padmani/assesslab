
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Function to check if the model_answer and explanation columns exist
export async function ensureAssessmentColumnsExist() {
  try {
    // Check if model_answer column exists with client-side function
    const modelAnswerExists = await checkColumnExists('assessment_questions', 'model_answer');
    
    // Check if explanation column exists
    const explanationExists = await checkColumnExists('assessment_questions', 'explanation');
    
    // Add the model_answer column if it doesn't exist
    if (!modelAnswerExists) {
      await addColumn('assessment_questions', 'model_answer', 'text');
    }
    
    // Add the explanation column if it doesn't exist
    if (!explanationExists) {
      await addColumn('assessment_questions', 'explanation', 'text');
    }
    
    // Ensure test_answers table exists
    const tableExists = await checkTableExists('test_answers');
    
    if (!tableExists) {
      // Create test_answers table using client-side function
      await createTestAnswersTable();
    }
    
    console.log("Assessment schema migration successful");
  } catch (error) {
    console.error("Error ensuring assessment columns exist:", error);
    toast.error("Error updating assessment schema");
  }
}

// Helper function to check if a column exists
async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', tableName)
      .eq('column_name', columnName)
      .maybeSingle();
    
    if (error) {
      console.error(`Error checking if ${columnName} column exists:`, error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error(`Error in checkColumnExists for ${columnName}:`, error);
    return false;
  }
}

// Helper function to add a column
async function addColumn(tableName: string, columnName: string, columnType: string): Promise<boolean> {
  try {
    // Use raw SQL query since RPC may not be available
    const { error } = await supabase.rpc(
      'execute_sql',
      { 
        sql: `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${columnType};` 
      }
    );
    
    if (error) {
      console.error(`Error adding ${columnName} column:`, error);
      return false;
    }
    
    console.log(`Added ${columnName} column to ${tableName}`);
    return true;
  } catch (error) {
    console.error(`Error in addColumn for ${columnName}:`, error);
    return false;
  }
}

// Helper function to check if a table exists
async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', tableName)
      .maybeSingle();
    
    if (error) {
      console.error(`Error checking if ${tableName} table exists:`, error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error(`Error in checkTableExists for ${tableName}:`, error);
    return false;
  }
}

// Helper function to create the test_answers table
async function createTestAnswersTable(): Promise<boolean> {
  try {
    // Use raw SQL query since RPC may not be available
    const { error } = await supabase.rpc(
      'execute_sql',
      { 
        sql: `
          CREATE TABLE IF NOT EXISTS test_answers (
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
    
    if (error) {
      console.error("Error creating test_answers table:", error);
      return false;
    }
    
    console.log("Created test_answers table");
    return true;
  } catch (error) {
    console.error("Error in createTestAnswersTable:", error);
    return false;
  }
}
