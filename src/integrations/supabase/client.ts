
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://aigunjkwusokdunyyfdt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpZ3Vuamt3dXNva2R1bnl5ZmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4NzQ3NjIsImV4cCI6MjA1NTQ1MDc2Mn0.DXytjTPF_x3joW_dsr_USPhdN7PDzela4dlHOWNUSWM";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

/**
 * Helper function to get the current user's team ID
 * @returns Promise with the team ID or null
 */
export async function getUserTeamId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
      .maybeSingle();
      
    return profile?.team_id || null;
  } catch (error) {
    console.error('Error getting user team ID:', error);
    return null;
  }
}

// Define literal types for table names to avoid type problems
export const TableNames = {
  students: 'students',
  classes: 'classes',
  subjects: 'subjects',
  tests: 'tests'
} as const;

// Create a type from the values of TableNames
export type TableName = typeof TableNames[keyof typeof TableNames];

// Define a generic interface for the returned data to fix "excessively deep" type errors
export interface TeamDataResult<T> {
  data: T[] | null;
  error: Error | null;
}

/**
 * Helper function to retrieve data with team ID consideration
 * @param tableName The name of the table to query
 * @param columns The columns to select
 */
export async function getTeamData<T>(tableName: TableName, columns: string): Promise<TeamDataResult<T>> {
  try {
    const teamId = await getUserTeamId();
    const userResponse = await supabase.auth.getUser();
    const user = userResponse.data.user;
    
    if (!user) {
      throw new Error('You must be logged in');
    }
    
    if (teamId) {
      // Use completely generic typing to avoid type instantiation issues
      const query = supabase
        .from(tableName)
        .select(columns)
        .eq('team_id', teamId);
        
      // Execute the query outside the type system
      const rawResult = await query;
      
      if (rawResult.error) {
        console.error(`Error querying ${tableName}:`, rawResult.error);
        // Fall back to user_id query
        const fallbackQuery = supabase
          .from(tableName)
          .select(columns)
          .eq('user_id', user.id);
          
        const rawFallbackResult = await fallbackQuery;
        return { data: rawFallbackResult.data as T[], error: null };
      }
      
      return { data: rawResult.data as T[], error: null };
    } else {
      // No team, use personal data only
      const query = supabase
        .from(tableName)
        .select(columns)
        .eq('user_id', user.id);
        
      const rawResult = await query;
      return { data: rawResult.data as T[], error: null };
    }
  } catch (error) {
    console.error(`Error in getTeamData for ${tableName}:`, error);
    return { data: null, error: error as Error };
  }
}
