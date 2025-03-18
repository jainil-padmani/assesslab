
export type Subject = {
  id: string;
  created_at?: string;
  name: string;
  subject_code: string;
  user_id: string;
  semester: number;
  information_pdf_url?: string | null;
};

export type StudentSubject = {
  id: string;
  created_at?: string;
  student_id: string;
  subject_id: string;
  grade: string;
};

export type Student = {
  id: string;
  name: string;
  gr_number: string;
  roll_number?: string | null;
  year?: number | null;
  department: string;
  class?: string | null;
  class_id?: string | null;
  overall_percentage?: number | null;
  created_at?: string;
  login_enabled?: boolean;
  login_id_type?: 'gr_number' | 'roll_number' | 'email';
  email?: string | null;
  password?: string | null; // This is only used for form submission and not stored directly
};

export type Class = {
  id: string;
  created_at?: string;
  name: string;
  department: string | null;
  year: number | null;
  user_id: string;
};

export type SubjectFile = {
  id: string;
  subject_id: string;
  topic: string;
  question_paper_url: string;
  answer_key_url: string;
  handwritten_paper_url: string | null;
  created_at: string;
};

export type BloomsTaxonomy = {
  remember: number;
  understand: number;
  apply: number;
  analyze: number;
  evaluate: number;
  create: number;
  [key: string]: number;
};

export type CourseOutcome = {
  id: string;
  subject_id: string;
  co_number: number;
  description: string;
  created_at?: string;
};

export type AnalysisResult = {
  id: string;
  title: string;
  analysis: any;
  created_at: string;
  user_id: string;
};
