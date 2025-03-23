
// If there are any missing assessment-related types, add them here

export interface AssessmentQuestion {
  id?: string;
  assessment_id?: string;
  question_text: string;
  question_type: 'mcq' | 'theory' | 'true_false';
  options?: Array<{ id: string; text: string }>;
  correct_answer?: string | null;
  marks: number;
  order_number?: number;
  source_question_id?: string;
}

export interface Assessment {
  id: string;
  title: string;
  instructions?: string;
  subject_id: string;
  user_id: string;
  student_id?: string;
  test_id?: string;
  status: 'draft' | 'published' | 'completed' | 'pending';
  shuffle_answers?: boolean;
  time_limit?: number | null;
  allow_multiple_attempts?: boolean;
  show_responses?: boolean;
  show_responses_timing?: string;
  show_correct_answers?: boolean;
  show_correct_answers_at?: string | null;
  hide_correct_answers_at?: string | null;
  one_question_at_time?: boolean;
  access_code?: string | null;
  due_date?: string | null;
  available_from?: string | null;
  available_until?: string | null;
  link_code?: string | null;
  created_at: string;
  updated_at: string;
  answer_sheet_url?: string;
  zip_url?: string;
  text_content?: string;
}

export interface StudentAssessmentAttempt {
  id: string;
  assessment_id: string;
  student_id: string;
  start_time: string;
  end_time?: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  score?: number;
  max_score?: number;
  percentage?: number;
  answers?: Record<string, any>;
  created_at: string;
}
