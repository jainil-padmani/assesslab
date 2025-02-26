
export interface Profile {
  id: string;
  name: string | null;
  mobile: string | null;
  post: string | null;
  subject: string | null;
  nationality: string | null;
  updated_at: string | null;
}

export interface Student {
  id: string;
  name: string;
  email: string | null;
  gr_number: string;
  parent_name: string | null;
  parent_contact: string | null;
  department: string;
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  subject_code: string;
  semester: number;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
      };
      students: {
        Row: Student;
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          gr_number: string;
          parent_name?: string | null;
          parent_contact?: string | null;
          department: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          gr_number?: string;
          parent_name?: string | null;
          parent_contact?: string | null;
          department?: string;
        };
        Select: Student;
      };
      subjects: {
        Row: Subject;
        Insert: {
          id?: string;
          name: string;
          subject_code: string;
          semester: number;
        };
        Update: {
          id?: string;
          name?: string;
          subject_code?: string;
          semester?: number;
        };
        Select: Subject;
      };
      answer_keys: {
        Row: {
          content: any;
          created_at: string;
          id: string;
          subject_id: string;
          title: string;
        };
        Insert: {
          content: any;
          id?: string;
          subject_id: string;
          title: string;
        };
        Update: {
          content?: any;
          id?: string;
          subject_id?: string;
          title?: string;
        };
        Select: {
          content: any;
          created_at: string;
          id: string;
          subject_id: string;
          title: string;
        };
      };
      assessments: {
        Row: {
          answer_key_id: string;
          answer_sheet_url: string | null;
          created_at: string;
          id: string;
          score: number | null;
          status: string;
          student_id: string;
          subject_id: string;
        };
        Insert: {
          answer_key_id: string;
          answer_sheet_url?: string | null;
          id?: string;
          score?: number | null;
          status: string;
          student_id: string;
          subject_id: string;
        };
        Update: {
          answer_key_id?: string;
          answer_sheet_url?: string | null;
          id?: string;
          score?: number | null;
          status?: string;
          student_id?: string;
          subject_id?: string;
        };
        Select: {
          answer_key_id: string;
          answer_sheet_url: string | null;
          created_at: string;
          id: string;
          score: number | null;
          status: string;
          student_id: string;
          subject_id: string;
        };
      };
      analysis_history: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          analysis: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          analysis: any;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          analysis?: any;
        };
        Select: {
          id: string;
          user_id: string;
          title: string;
          analysis: any;
          created_at: string;
        };
      };
    };
  };
}
