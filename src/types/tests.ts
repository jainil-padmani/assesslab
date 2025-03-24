
import { Student } from './dashboard';

export interface Test {
  id: string;
  name: string;
  subject_id: string;
  class_id: string;
  test_date: string;
  max_marks: number;
  created_at: string;
}

export interface TestGrade {
  id: string;
  test_id: string;
  student_id: string;
  marks: number;
  remarks: string | null;
  created_at: string;
  student?: Student;
}

export interface TestFormData {
  name: string;
  subject_id: string;
  class_id: string;
  test_date: string;
  max_marks: number;
}

export interface TestAnswer {
  id: string;
  student_id: string;
  test_id: string;
  subject_id: string;
  answer_sheet_url?: string | null;
  text_content?: string | null;
  created_at: string;
}
