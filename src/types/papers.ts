
import { Json } from "@/integrations/supabase/types";

export interface BloomsTaxonomy {
  remember: { delivery: number; evaluation: number };
  understand: { delivery: number; evaluation: number };
  apply: { delivery: number; evaluation: number };
  analyze: { delivery: number; evaluation: number };
  evaluate: { delivery: number; evaluation: number };
  create: { delivery: number; evaluation: number };
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
  questions: Question[];
  header_url?: string;
  footer_url?: string;
  content_url?: string;
  created_at: string;
  subject_name?: string;
}
