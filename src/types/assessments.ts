
export interface Assessment {
  id: string;
  title: string;
  instructions?: string;
  subject_id: string;
  user_id: string;
  shuffle_answers: boolean;
  time_limit?: number;
  allow_multiple_attempts: boolean;
  show_responses: boolean;
  show_responses_timing: string;
  show_correct_answers: boolean;
  show_correct_answers_at?: string;
  hide_correct_answers_at?: string;
  one_question_at_time: boolean;
  access_code?: string;
  ip_addresses?: string[];
  due_date?: string;
  available_from?: string;
  available_until?: string;
  status: string;
  link_code?: string;
  created_at: string;
  updated_at: string;
}

export interface AssessmentQuestion {
  id: string;
  assessment_id: string;
  question_text: string;
  question_type: 'mcq' | 'theory';
  options?: {
    id: string;
    text: string;
  }[];
  correct_answer?: string;
  marks: number;
  order_number: number;
  source_question_id?: string;
  created_at: string;
}

export interface StudentAssessmentAttempt {
  id: string;
  assessment_id: string;
  student_id: string;
  start_time: string;
  end_time?: string;
  ip_address?: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  score?: number;
  max_score?: number;
  percentage?: number;
  test_id?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentAssessmentAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  student_answer?: string;
  is_correct?: boolean;
  marks_awarded?: number;
  feedback?: string;
  created_at: string;
}
