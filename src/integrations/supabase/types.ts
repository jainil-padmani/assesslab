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
      assessment_questions: {
        Row: {
          assessment_id: string
          correct_answer: string
          created_at: string
          id: string
          options: string[] | null
          points: number
          question_order: number
          question_text: string
          question_type: string
        }
        Insert: {
          assessment_id: string
          correct_answer: string
          created_at?: string
          id?: string
          options?: string[] | null
          points?: number
          question_order?: number
          question_text: string
          question_type: string
        }
        Update: {
          assessment_id?: string
          correct_answer?: string
          created_at?: string
          id?: string
          options?: string[] | null
          points?: number
          question_order?: number
          question_text?: string
          question_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments_master"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          answer_sheet_url: string | null
          created_at: string
          id: string
          status: string | null
          student_id: string
          subject_id: string
          test_id: string | null
          text_content: string | null
          updated_at: string
          zip_url: string | null
        }
        Insert: {
          answer_sheet_url?: string | null
          created_at?: string
          id?: string
          status?: string | null
          student_id: string
          subject_id: string
          test_id?: string | null
          text_content?: string | null
          updated_at?: string
          zip_url?: string | null
        }
        Update: {
          answer_sheet_url?: string | null
          created_at?: string
          id?: string
          status?: string | null
          student_id?: string
          subject_id?: string
          test_id?: string | null
          text_content?: string | null
          updated_at?: string
          zip_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments_master: {
        Row: {
          assign_to: string[] | null
          available_from: string | null
          available_until: string | null
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          instructions: string | null
          options: Json
          restrictions: Json
          status: string
          subject_id: string
          title: string
        }
        Insert: {
          assign_to?: string[] | null
          available_from?: string | null
          available_until?: string | null
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          instructions?: string | null
          options?: Json
          restrictions?: Json
          status?: string
          subject_id: string
          title: string
        }
        Update: {
          assign_to?: string[] | null
          available_from?: string | null
          available_until?: string | null
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          instructions?: string | null
          options?: Json
          restrictions?: Json
          status?: string
          subject_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_master_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
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
          pdf_url: string | null
          question_mode: string
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
          pdf_url?: string | null
          question_mode?: string
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
          pdf_url?: string | null
          question_mode?: string
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
      generated_questions: {
        Row: {
          created_at: string
          id: string
          question_mode: string
          questions: Json
          subject_id: string
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_mode?: string
          questions: Json
          subject_id: string
          topic: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_mode?: string
          questions?: Json
          subject_id?: string
          topic?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_questions_subject_id_fkey"
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
      paper_formats: {
        Row: {
          created_at: string
          duration: number
          footer_text: string | null
          header_text: string | null
          id: string
          pdf_url: string | null
          sections: Json
          subject_id: string
          title: string
          total_marks: number
          user_id: string
        }
        Insert: {
          created_at?: string
          duration?: number
          footer_text?: string | null
          header_text?: string | null
          id: string
          pdf_url?: string | null
          sections: Json
          subject_id: string
          title: string
          total_marks?: number
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: number
          footer_text?: string | null
          header_text?: string | null
          id?: string
          pdf_url?: string | null
          sections?: Json
          subject_id?: string
          title?: string
          total_marks?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_formats_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
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
      questions: {
        Row: {
          correct_answer: string
          created_at: string
          id: string
          options: string[] | null
          question_text: string
          topic_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          id?: string
          options?: string[] | null
          question_text: string
          topic_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          id?: string
          options?: string[] | null
          question_text?: string
          topic_id?: string
        }
        Relationships: []
      }
      student_assessment_attempts: {
        Row: {
          answers: Json
          assessment_id: string
          attempt_number: number
          id: string
          possible_score: number
          score: number
          status: string
          student_id: string
          submitted_at: string
          time_spent: number
        }
        Insert: {
          answers?: Json
          assessment_id: string
          attempt_number?: number
          id?: string
          possible_score?: number
          score?: number
          status?: string
          student_id: string
          submitted_at?: string
          time_spent?: number
        }
        Update: {
          answers?: Json
          assessment_id?: string
          attempt_number?: number
          id?: string
          possible_score?: number
          score?: number
          status?: string
          student_id?: string
          submitted_at?: string
          time_spent?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_assessment_attempts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assessment_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          student_id: string
          test_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          student_id: string
          test_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          student_id?: string
          test_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_notifications_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
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
          login_enabled: boolean | null
          login_id_type: string | null
          name: string
          overall_percentage: number | null
          parent_contact: string | null
          parent_name: string | null
          password: string | null
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
          login_enabled?: boolean | null
          login_id_type?: string | null
          name: string
          overall_percentage?: number | null
          parent_contact?: string | null
          parent_name?: string | null
          password?: string | null
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
          login_enabled?: boolean | null
          login_id_type?: string | null
          name?: string
          overall_percentage?: number | null
          parent_contact?: string | null
          parent_name?: string | null
          password?: string | null
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
      test_answers: {
        Row: {
          answer_sheet_url: string | null
          created_at: string
          id: string
          student_id: string
          subject_id: string
          test_id: string
          text_content: string | null
        }
        Insert: {
          answer_sheet_url?: string | null
          created_at?: string
          id?: string
          student_id: string
          subject_id: string
          test_id: string
          text_content?: string | null
        }
        Update: {
          answer_sheet_url?: string | null
          created_at?: string
          id?: string
          student_id?: string
          subject_id?: string
          test_id?: string
          text_content?: string | null
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
      add_column: {
        Args: {
          table_name_param: string
          column_name_param: string
          column_type_param: string
        }
        Returns: undefined
      }
      check_column_exists: {
        Args: {
          table_name_param: string
          column_name_param: string
        }
        Returns: boolean
      }
      check_table_exists: {
        Args: {
          table_name_param: string
        }
        Returns: boolean
      }
      select_all_test_answers_for_test: {
        Args: {
          test_id_param: string
        }
        Returns: {
          answer_sheet_url: string | null
          created_at: string
          id: string
          student_id: string
          subject_id: string
          test_id: string
          text_content: string | null
        }[]
      }
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
