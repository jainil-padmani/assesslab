
import type { Database } from "@/integrations/supabase/types";

export interface Student {
  id: string;
  name: string;
  roll_number: string;
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  created_at: string;
}

export interface AnswerKey {
  id: string;
  title: string;
  subject_id: string;
  content: any;
  created_at: string;
}

export interface Assessment {
  id: string;
  student_id: string;
  subject_id: string;
  answer_key_id: string;
  answer_sheet_url: string | null;
  score: number | null;
  status: string;
  created_at: string;
}
