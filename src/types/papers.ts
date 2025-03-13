
import { Json } from "@/integrations/supabase/types";

export interface BloomsTaxonomy {
  remember: number;
  understand: number;
  apply: number;
  analyze: number;
  evaluate: number;
  create: number;
}

export interface CourseOutcomeConfig {
  id: string;
  co_number: number;
  description: string;
  questionCount: number;
  selected: boolean;
}

export interface Question {
  id: string;
  text: string;
  type: string;
  marks: number;
  level: string; // blooms taxonomy level
  courseOutcome?: number; // CO number this question belongs to
  selected?: boolean;
}

// Ensure Question type is properly handled in the JSON type
export type QuestionData = Question | string;

export interface GeneratedPaper {
  id: string;
  user_id: string;
  subject_id: string;
  topic: string;
  paper_url: string;
  questions: Question[] | Json; // Allow both Question[] and Json for compatibility
  header_url?: string | null;
  footer_url?: string | null;
  content_url?: string | null;
  created_at: string;
  subject_name?: string;
  pdf_url?: string | null; // Field for PDF URL
}

export interface GeneratedQuestions {
  id: string;
  user_id: string;
  subject_id: string;
  topic: string;
  questions: Question[] | Json;
  created_at: string;
  subject_name?: string;
}
