
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
  information_pdf_url?: string;
  files?: SubjectFile[];
}

export interface SubjectFile {
  id: string;
  subject_id: string;
  topic: string;
  question_paper_url: string;
  answer_key_url: string;
  created_at: string;
}

export interface BloomsTaxonomy {
  remember: number;
  understand: number;
  apply: number;
  analyze: number;
  evaluate: number;
  create: number;
}

export interface AnswerKey {
  id: string;
  title: string;
  subject_id: string;
  content: any;
  blooms_taxonomy: BloomsTaxonomy;
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
  co_analysis: {
    [key: string]: {
      achieved_marks: number;
      total_marks: number;
      percentage: number;
    };
  };
  created_at: string;
}

export interface AnalysisResult {
  bloomsTaxonomy: BloomsTaxonomy;
  expectedBloomsTaxonomy?: BloomsTaxonomy;
  topics?: Array<{
    name: string;
    questionCount: number;
  }>;
  difficulty?: Array<{
    name: string;
    value: number;
  }>;
  overallAssessment?: string;
  recommendations?: string[];
}
