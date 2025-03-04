
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

// Define type-safe tables that can be accessed with team queries
type TableNames = 'students' | 'classes' | 'subjects' | 'tests';

/**
 * Helper function to create a query builder that considers team ID
 * @param table The table name to query
 * @returns Object with methods for common operations
 */
export function teamQuery(table: TableNames) {
  return {
    select: async (columns: string) => {
      const teamId = await getUserTeamId();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('You must be logged in');
      
      if (teamId) {
        // Try querying with team_id first (if table has this column)
        try {
          const { data, error } = await supabase
            .from(table)
            .select(columns)
            .eq('team_id', teamId);
          
          if (error && error.message.includes('column "team_id" does not exist')) {
            // Fall back to user_id
            return await supabase
              .from(table)
              .select(columns)
              .eq('user_id', user.id);
          }
          
          return { data, error };
        } catch (error) {
          console.error(`Error querying ${table}:`, error);
          // Fall back to user_id
          return await supabase
            .from(table)
            .select(columns)
            .eq('user_id', user.id);
        }
      } else {
        // No team, use personal data only
        return await supabase
          .from(table)
          .select(columns)
          .eq('user_id', user.id);
      }
    }
  };
}

// Note: With Row-Level Security enabled, users need to be authenticated
// to access their data. Sign in users with:
//
// await supabase.auth.signInWithPassword({
//   email: 'user@example.com',
//   password: 'password123'
// });
