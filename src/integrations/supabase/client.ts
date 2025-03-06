
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://aigunjkwusokdunyyfdt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpZ3Vuamt3dXNva2R1bnl5ZmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4NzQ3NjIsImV4cCI6MjA1NTQ1MDc2Mn0.DXytjTPF_x3joW_dsr_USPhdN7PDzela4dlHOWNUSWM";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Define literal types for table names to avoid type problems
export const TableNames = {
  students: 'students',
  classes: 'classes',
  subjects: 'subjects',
  tests: 'tests'
} as const;

// Create a type from the values of TableNames
export type TableName = typeof TableNames[keyof typeof TableNames];
