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
          year: number | null
        }
        Insert: {
          class?: string | null
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
          year?: number | null
        }
        Update: {
          class?: string | null
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
          year?: number | null
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string
          id: string
          name: string
          semester: number
          subject_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          semester: number
          subject_code: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          semester?: number
          subject_code?: string
        }
        Relationships: []
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
