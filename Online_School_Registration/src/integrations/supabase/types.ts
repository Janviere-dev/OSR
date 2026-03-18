export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          created_at: string
          id: string
          momo_id: string | null
          previous_school_name: string | null
          proof_payment_url: string | null
          school_id: string
          status: string
          student_id: string
          transcripts_url: string | null
          transfer_reason: string | null
          type: Database["public"]["Enums"]["application_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          momo_id?: string | null
          previous_school_name?: string | null
          proof_payment_url?: string | null
          school_id: string
          status?: string
          student_id: string
          transcripts_url?: string | null
          transfer_reason?: string | null
          type?: Database["public"]["Enums"]["application_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          momo_id?: string | null
          previous_school_name?: string | null
          proof_payment_url?: string | null
          school_id?: string
          status?: string
          student_id?: string
          transcripts_url?: string | null
          transfer_reason?: string | null
          type?: Database["public"]["Enums"]["application_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          flutterwave_tx_id: string | null
          flutterwave_tx_ref: string
          id: string
          parent_id: string
          payment_method: string | null
          school_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          flutterwave_tx_id?: string | null
          flutterwave_tx_ref: string
          id?: string
          parent_id: string
          payment_method?: string | null
          school_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          flutterwave_tx_id?: string | null
          flutterwave_tx_ref?: string
          id?: string
          parent_id?: string
          payment_method?: string | null
          school_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          admin_id: string | null
          created_at: string
          district: string
          id: string
          is_approved: boolean
          logo_url: string | null
          name: string
          province: string
          qualifications: string | null
          requirements_pdf_url: string | null
          sector: string
          staff_name: string | null
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          district: string
          id?: string
          is_approved?: boolean
          logo_url?: string | null
          name: string
          province: string
          qualifications?: string | null
          requirements_pdf_url?: string | null
          sector: string
          staff_name?: string | null
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          district?: string
          id?: string
          is_approved?: boolean
          logo_url?: string | null
          name?: string
          province?: string
          qualifications?: string | null
          requirements_pdf_url?: string | null
          sector?: string
          staff_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          class_stream: string | null
          created_at: string
          current_grade: string | null
          dob: string
          father_name: string | null
          id: string
          mother_name: string | null
          name: string
          parent_id: string
          school_id: string | null
          status: Database["public"]["Enums"]["student_status"]
          student_id_code: string | null
          updated_at: string
        }
        Insert: {
          class_stream?: string | null
          created_at?: string
          current_grade?: string | null
          dob: string
          father_name?: string | null
          id?: string
          mother_name?: string | null
          name: string
          parent_id: string
          school_id?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          student_id_code?: string | null
          updated_at?: string
        }
        Update: {
          class_stream?: string | null
          created_at?: string
          current_grade?: string | null
          dob?: string
          father_name?: string | null
          id?: string
          mother_name?: string | null
          name?: string
          parent_id?: string
          school_id?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          student_id_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_user_role: {
        Args: {
          p_role: string
          p_user_id: string
        }
        Returns: undefined
      }
      create_school_for_admin: {
        Args: {
          p_admin_id: string
          p_district: string
          p_is_approved?: boolean
          p_name: string
          p_province: string
          p_qualifications: string | null
          p_sector: string
          p_staff_name: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "parent" | "school_admin"
      application_type: "new" | "transfer"
      student_status: "pending" | "passed" | "repeat"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["parent", "school_admin"],
      application_type: ["new", "transfer"],
      student_status: ["pending", "passed", "repeat"],
    },
  },
} as const
