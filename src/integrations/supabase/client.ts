import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://aigunjkwusokdunyyfdt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpZ3Vuamt3dXNva2R1bnl5ZmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4NzQ3NjIsImV4cCI6MjA1NTQ1MDc2Mn0.DXytjTPF_x3joW_dsr_USPhdN7PDzela4dlHOWNUSWM";

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

// Simple interface for returning data and errors
export interface SimpleDataResult<T extends Record<string, any>> {
  data: T[] | null;
  error: Error | null;
}

/**
 * Helper function to retrieve data with team ID consideration
 * This implementation avoids excessive type instantiation
 */
export async function getTeamData<T extends Record<string, any>>(
  tableName: TableName, 
  columns: string
): Promise<SimpleDataResult<T>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: new Error('You must be logged in') };
    }
    
    const teamId = await getUserTeamId();
    
    const query = teamId
      ? supabase.from(tableName).select(columns).eq('team_id', teamId)
      : supabase.from(tableName).select(columns).eq('user_id', user.id);
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`Error querying ${tableName}:`, error);
      return { data: null, error };
    }
    
    return { data: data as T[], error: null };
  } catch (error) {
    console.error(`Error in getTeamData for ${tableName}:`, error);
    return { data: null, error: error as Error };
  }
}
