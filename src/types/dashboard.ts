
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
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  subject_code: string;
  semester: number;
  information_pdf_url: string | null;
  created_at: string;
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
