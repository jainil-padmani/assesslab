
import { supabase } from "@/integrations/supabase/client";

/**
 * Check if a table exists in the database
 * @param tableName The name of the table to check
 */
export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc(
      'check_table_exists',
      { table_name_param: tableName }
    );
    
    if (error) {
      console.error(`Error checking if table ${tableName} exists:`, error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

/**
 * Check if a column exists in a table
 * @param tableName The name of the table
 * @param columnName The name of the column to check
 */
export async function checkColumnExists(
  tableName: string, 
  columnName: string
): Promise<boolean> {
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
    console.error(`Error checking if column ${columnName} exists in table ${tableName}:`, error);
    return false;
  }
}

/**
 * Select all test answers for a specific test
 * @param testId The test ID
 */
export async function selectAllTestAnswersForTest(testId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc(
      'select_all_test_answers_for_test',
      { test_id_param: testId }
    );
    
    if (error) {
      console.error(`Error fetching test answers for test ${testId}:`, error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error(`Error fetching test answers for test ${testId}:`, error);
    return [];
  }
}
