
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
  pdf_url?: string | null; // New field for PDF URL
}

export interface PaperSection {
  id: string;
  title: string;
  instructions?: string;
  questions: PaperQuestion[];
  [key: string]: any; // Add index signature for JSON compatibility
}

export interface PaperQuestion {
  id: string;
  number: string; // e.g., "1", "2", "1.a", "1.b"
  text: string;
  marks: number;
  level: string; // blooms taxonomy level
  courseOutcome?: number; // CO number this question belongs to
  subQuestions?: PaperQuestion[];
  selectedQuestion?: Question; // Reference to a stored question
  [key: string]: any; // Add index signature for JSON compatibility
}

export interface PaperFormat {
  id: string;
  title: string;
  subject_id: string;
  totalMarks: number;
  duration: number; // in minutes
  headerText?: string;
  footerText?: string;
  sections: PaperSection[];
  created_at?: string;
  user_id?: string;
}
