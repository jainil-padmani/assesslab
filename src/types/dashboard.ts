
import type { Database } from "@/integrations/supabase/types";

export interface Student {
  id: string;
  name: string;
  email: string | null;
  gr_number: string;
  roll_number: string | null;
  year: number | null;
  class: string | null;
  overall_percentage: number | null;
  parent_name: string | null;
  parent_contact: string | null;
  department: string;
  created_at: string;
}

export interface StudentSubject {
  id: string;
  student_id: string;
  subject_id: string;
  grade: string | null;
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  subject_code: string;
  semester: number;
  created_at: string;
}

export interface CourseOutcome {
  id: string;
  subject_id: string;
  code: string;
  description: string;
  created_at: string;
}

export interface AnswerKey {
  id: string;
  title: string;
  subject_id: string;
  content: any;
  course_outcomes: CourseOutcomeMapping[];
  created_at: string;
}

export interface CourseOutcomeMapping {
  question_number: number;
  co_id: string;
  marks: number;
}

export interface Assessment {
  id: string;
  student_id: string;
  subject_id: string;
  answer_key_id: string;
  answer_sheet_url: string | null;
  score: number | null;
  status: string;
  co_analysis: {
    [key: string]: {
      achieved_marks: number;
      total_marks: number;
      percentage: number;
    };
  };
  created_at: string;
}
