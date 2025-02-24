export interface Profile {
  id: string;
  name: string | null;
  mobile: string | null;
  post: string | null;
  subject: string | null;
  nationality: string | null;
  updated_at: string | null;
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
        Row: {
          created_at: string;
          id: string;
          name: string;
          roll_number: string;
        };
        Insert: {
          id?: string;
          name: string;
          roll_number: string;
        };
        Update: {
          id?: string;
          name?: string;
          roll_number?: string;
        };
        Select: {
          created_at: string;
          id: string;
          name: string;
          roll_number: string;
        };
      };
      subjects: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
        Select: {
          created_at: string;
          id: string;
          name: string;
        };
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
    };
  };
}
