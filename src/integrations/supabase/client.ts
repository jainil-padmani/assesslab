
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
      .single();
      
    return profile?.team_id || null;
  } catch (error) {
    console.error('Error getting user team ID:', error);
    return null;
  }
}

// Define literal types for table names to avoid type problems
export const TableNames = {
  students: 'students' as const,
  classes: 'classes' as const,
  subjects: 'subjects' as const,
  tests: 'tests' as const
} as const;

// Create a type from the values of TableNames
export type TableName = typeof TableNames[keyof typeof TableNames];

/**
 * Helper function to create a query builder that considers team ID
 * @param table The table name to query
 * @returns Object with methods for common operations
 */
export function teamQuery(table: TableName) {
  return {
    select: async (columns: string) => {
      try {
        const teamId = await getUserTeamId();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('You must be logged in');
        }
        
        // Check for team_id
        if (teamId) {
          const { data, error } = await supabase
            .from(table)
            .select(columns);
            
          if (error) {
            console.error(`Error querying ${table}:`, error);
            // Fall back to user_id query
            return await supabase
              .from(table)
              .select(columns)
              .eq('user_id', user.id);
          }
          
          return { data, error };
        } else {
          // No team, use personal data only
          return await supabase
            .from(table)
            .select(columns)
            .eq('user_id', user.id);
        }
      } catch (error) {
        console.error(`Error in teamQuery for ${table}:`, error);
        return { data: null, error };
      }
    }
  };
}
