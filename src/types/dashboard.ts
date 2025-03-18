
export type Subject = {
  id: string;
  created_at?: string;
  name: string;
  subject_code: string;
  user_id: string;
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
