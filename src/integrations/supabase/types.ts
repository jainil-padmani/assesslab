export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      analysis_history: {
        Row: {
          analysis: Json
          created_at: string
          id: string
          title: string
          user_id: string | null
        }
        Insert: {
          analysis: Json
          created_at?: string
          id?: string
          title: string
          user_id?: string | null
        }
        Update: {
          analysis?: Json
          created_at?: string
          id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      answer_keys: {
        Row: {
          blooms_taxonomy: Json
          content: Json | null
          created_at: string
          id: string
          subject_id: string | null
          title: string
        }
        Insert: {
          blooms_taxonomy?: Json
          content?: Json | null
          created_at?: string
          id?: string
          subject_id?: string | null
          title: string
        }
        Update: {
          blooms_taxonomy?: Json
          content?: Json | null
          created_at?: string
          id?: string
          subject_id?: string | null
          title?: string
        }
        Relationships: []
      }
      assessments: {
        Row: {
          answer_key_id: string | null
          answer_sheet_url: string | null
          co_analysis: Json | null
          created_at: string
          id: string
          score: number | null
          status: string | null
          student_id: string | null
          subject_id: string | null
        }
        Insert: {
          answer_key_id?: string | null
          answer_sheet_url?: string | null
          co_analysis?: Json | null
          created_at?: string
          id?: string
          score?: number | null
          status?: string | null
          student_id?: string | null
          subject_id?: string | null
        }
        Update: {
          answer_key_id?: string | null
          answer_sheet_url?: string | null
          co_analysis?: Json | null
          created_at?: string
          id?: string
          score?: number | null
          status?: string | null
          student_id?: string | null
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_answer_key_id_fkey"
            columns: ["answer_key_id"]
            isOneToOne: false
            referencedRelation: "answer_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          department: string | null
          id: string
          name: string
          user_id: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          name: string
          user_id?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          name?: string
          user_id?: string | null
          year?: number | null
        }
        Relationships: []
      }
      course_outcomes: {
        Row: {
          co_number: number
          created_at: string
          description: string
          id: string
          subject_id: string
        }
        Insert: {
          co_number: number
          created_at?: string
          description: string
          id?: string
          subject_id: string
        }
        Update: {
          co_number?: number
          created_at?: string
          description?: string
          id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_outcomes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      file_uploads: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          upload_type: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          upload_type: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          upload_type?: string
        }
        Relationships: []
      }
      generated_papers: {
        Row: {
          content_url: string | null
          created_at: string
          footer_url: string | null
          header_url: string | null
          id: string
          paper_url: string
          questions: Json
          subject_id: string
          topic: string
          user_id: string
        }
        Insert: {
          content_url?: string | null
          created_at?: string
          footer_url?: string | null
          header_url?: string | null
          id?: string
          paper_url: string
          questions?: Json
          subject_id: string
          topic: string
          user_id: string
        }
        Update: {
          content_url?: string | null
          created_at?: string
          footer_url?: string | null
          header_url?: string | null
          id?: string
          paper_url?: string
          questions?: Json
          subject_id?: string
          topic?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_papers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_evaluations: {
        Row: {
          created_at: string
          evaluation_data: Json
          id: string
          status: string
          student_id: string
          subject_id: string
          test_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          evaluation_data?: Json
          id?: string
          status?: string
          student_id: string
          subject_id: string
          test_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          evaluation_data?: Json
          id?: string
          status?: string
          student_id?: string
          subject_id?: string
          test_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_evaluations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paper_evaluations_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paper_evaluations_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          mobile: string | null
          name: string | null
          nationality: string | null
          post: string | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          mobile?: string | null
          name?: string | null
          nationality?: string | null
          post?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          mobile?: string | null
          name?: string | null
          nationality?: string | null
          post?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      student_subjects: {
        Row: {
          created_at: string
          grade: string | null
          id: string
          student_id: string | null
          subject_id: string | null
        }
        Insert: {
          created_at?: string
          grade?: string | null
          id?: string
          student_id?: string | null
          subject_id?: string | null
        }
        Update: {
          created_at?: string
          grade?: string | null
          id?: string
          student_id?: string | null
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_subjects_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          class: string | null
          class_id: string | null
          created_at: string
          department: string
          email: string | null
          gr_number: string
          id: string
          name: string
          overall_percentage: number | null
          parent_contact: string | null
          parent_name: string | null
          roll_number: string | null
          user_id: string | null
          year: number | null
        }
        Insert: {
          class?: string | null
          class_id?: string | null
          created_at?: string
          department: string
          email?: string | null
          gr_number: string
          id?: string
          name: string
          overall_percentage?: number | null
          parent_contact?: string | null
          parent_name?: string | null
          roll_number?: string | null
          user_id?: string | null
          year?: number | null
        }
        Update: {
          class?: string | null
          class_id?: string | null
          created_at?: string
          department?: string
          email?: string | null
          gr_number?: string
          id?: string
          name?: string
          overall_percentage?: number | null
          parent_contact?: string | null
          parent_name?: string | null
          roll_number?: string | null
          user_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_documents: {
        Row: {
          created_at: string
          document_type: string
          document_url: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          subject_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          document_url: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          subject_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          document_url?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          subject_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_documents_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_enrollments: {
        Row: {
          created_at: string
          id: string
          student_id: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          student_id: string
          subject_id: string
        }
        Update: {
          created_at?: string
          id?: string
          student_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_enrollments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          id: string
          information_pdf_url: string | null
          name: string
          semester: number
          subject_code: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          information_pdf_url?: string | null
          name: string
          semester: number
          subject_code: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          information_pdf_url?: string | null
          name?: string
          semester?: number
          subject_code?: string
          user_id?: string | null
        }
        Relationships: []
      }
      test_grades: {
        Row: {
          created_at: string
          id: string
          marks: number
          remarks: string | null
          student_id: string
          test_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marks?: number
          remarks?: string | null
          student_id: string
          test_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marks?: number
          remarks?: string | null
          student_id?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_grades_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          class_id: string
          created_at: string
          id: string
          max_marks: number
          name: string
          subject_id: string
          test_date: string
          user_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          max_marks: number
          name: string
          subject_id: string
          test_date: string
          user_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          max_marks?: number
          name?: string
          subject_id?: string
          test_date?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
