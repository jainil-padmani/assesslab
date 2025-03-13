
export interface Student {
  id: string;
  name: string;
  gr_number: string;
  roll_number: string | null;
  year: number | null;
  class: string | null;
  class_id: string | null;
  department: string;
  overall_percentage: number | null;
  email: string | null;
  parent_name: string | null;
  parent_contact: string | null;
  created_at: string;
  team_id?: string | null;
  user_id?: string;
}

export interface Subject {
  id: string;
  name: string;
  subject_code: string;
  semester: number;
  information_pdf_url: string | null;
  created_at: string;
  user_id?: string;
  team_id?: string | null;
}

export interface StudentSubject {
  id: string;
  student_id: string;
  subject_id: string;
  grade: string | null;
  created_at: string;
}

export interface SubjectDocument {
  id: string;
  subject_id: string;
  document_url: string;
  document_type: string;
  file_name: string;
  file_type: string;
  file_size: number;
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

export interface SubjectFile {
  id: string;
  subject_id: string;
  topic: string;
  question_paper_url: string;
  answer_key_url: string;
  handwritten_paper_url: string | null;
  created_at: string;
}

export interface AnalysisResult {
  id: string;
  title: string;
  created_at: string;
  result_json: Record<string, any>;
  blooms_taxonomy?: BloomsTaxonomy;
  expectedBloomsTaxonomy?: BloomsTaxonomy;
  questions?: any[];
  difficulty?: any[];
  overallAssessment?: string;
  recommendations?: string[];
  suggestedChanges?: string;
}

export interface AnswerKey {
  id: string;
  subject_id: string | null;
  title: string;
  content: Record<string, any> | null;
  blooms_taxonomy?: BloomsTaxonomy;
  created_at: string;
}

export interface BloomsTaxonomyInput {
  remember: number;
  understand: number;
  apply: number;
  analyze: number;
  evaluate: number;
  create: number;
}

export interface Profile {
  id: string;
  name: string | null;
  mobile: string | null;
  post: string | null;
  subject: string | null;
  nationality: string | null;
  updated_at: string | null;
  team_id: string | null;
  team_code: string | null;
  email?: string | null;
}

export interface TeamMember {
  id: string;
  name: string | null;
  email: string | null;
}
