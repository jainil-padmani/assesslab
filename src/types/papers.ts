
import { Json } from "@/integrations/supabase/types";

export interface BloomsTaxonomy {
  remember: number;
  understand: number;
  apply: number;
  analyze: number;
  evaluate: number;
  create: number;
}

export interface Question {
  id: string;
  text: string;
  type: string;
  marks: number;
  level: string; // blooms taxonomy level
  selected?: boolean;
}

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
}
