
import { supabase } from "@/integrations/supabase/client";

// Function to check if a table exists
export const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc(
      'check_table_exists',
      { table_name: tableName }
    );
    
    if (error) {
      console.error(`Error checking if table ${tableName} exists:`, error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error(`Error in checkTableExists for ${tableName}:`, error);
    return false;
  }
};

// Function to check if a column exists in a table
export const checkColumnExists = async (tableName: string, columnName: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc(
      'check_column_exists',
      { 
        table_name_param: tableName, 
        column_name_param: columnName 
      }
    );
    
    if (error) {
      console.error(`Error checking if column ${columnName} exists in table ${tableName}:`, error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error(`Error in checkColumnExists for ${columnName} in ${tableName}:`, error);
    return false;
  }
};

// Function to select data from test_answers safely
export const selectFromTestAnswers = async (studentId: string, testId: string) => {
  try {
    // Check if the table exists first
    const tableExists = await checkTableExists('test_answers');
    if (!tableExists) return null;
    
    const { data, error } = await supabase.rpc(
      'select_from_test_answers',
      {
        student_id_param: studentId,
        test_id_param: testId
      }
    );
    
    if (error) {
      console.error("Error selecting from test_answers:", error);
      return null;
    }
    
    return data && Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error("Error in selectFromTestAnswers:", error);
    return null;
  }
};

// Function to select all test answers for a test
export const selectAllTestAnswersForTest = async (testId: string) => {
  try {
    // Check if the table exists first
    const tableExists = await checkTableExists('test_answers');
    if (!tableExists) return [];
    
    const { data, error } = await supabase.rpc(
      'select_all_test_answers_for_test',
      {
        test_id_param: testId
      }
    );
    
    if (error) {
      console.error("Error selecting all test_answers for test:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in selectAllTestAnswersForTest:", error);
    return [];
  }
};

// Function to update test_answers safely
export const updateTestAnswers = async (
  studentId: string, 
  testId: string, 
  textContent: string
): Promise<boolean> => {
  try {
    // Check if the table exists first
    const tableExists = await checkTableExists('test_answers');
    if (!tableExists) return false;
    
    const { error } = await supabase.rpc(
      'update_test_answers',
      {
        student_id_param: studentId,
        test_id_param: testId,
        text_content_param: textContent
      }
    );
    
    if (error) {
      console.error("Error updating test_answers:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in updateTestAnswers:", error);
    return false;
  }
};

// Function to insert into test_answers safely
export const insertTestAnswers = async (
  studentId: string, 
  testId: string, 
  subjectId: string, 
  textContent: string,
  answerSheetUrl?: string
): Promise<boolean> => {
  try {
    // Check if the table exists first
    const tableExists = await checkTableExists('test_answers');
    if (!tableExists) return false;
    
    const { error } = await supabase.rpc(
      'insert_test_answers',
      {
        student_id_param: studentId,
        test_id_param: testId,
        subject_id_param: subjectId,
        text_content_param: textContent,
        answer_sheet_url_param: answerSheetUrl || null
      }
    );
    
    if (error) {
      console.error("Error inserting into test_answers:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in insertTestAnswers:", error);
    return false;
  }
};
