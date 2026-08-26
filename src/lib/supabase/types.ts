// Generated from the live larder-dev schema via the Supabase MCP. Regenerate after schema changes.
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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          auth_id: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          pin_failed_attempts: number | null
          pin_hash: string | null
          pin_locked_until: string | null
          pin_set_at: string | null
          role: string
          staff_role_id: string | null
          venue_id: string | null
        }
        Insert: {
          auth_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          pin_failed_attempts?: number | null
          pin_hash?: string | null
          pin_locked_until?: string | null
          pin_set_at?: string | null
          role: string
          staff_role_id?: string | null
          venue_id?: string | null
        }
        Update: {
          auth_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          pin_failed_attempts?: number | null
          pin_hash?: string | null
          pin_locked_until?: string | null
          pin_set_at?: string | null
          role?: string
          staff_role_id?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_users_staff_role_id_fkey"
            columns: ["staff_role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_users_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_types: {
        Row: {
          id: string
          name: string
          venue_id: string | null
        }
        Insert: {
          id?: string
          name: string
          venue_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_types_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          retrieved_chunk_ids: string[] | null
          role: string
          user_id: string | null
          venue_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          retrieved_chunk_ids?: string[] | null
          role: string
          user_id?: string | null
          venue_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          retrieved_chunk_ids?: string[] | null
          role?: string
          user_id?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      check_questions: {
        Row: {
          expected_answer_context: string | null
          id: string
          module_id: string | null
          question: string
        }
        Insert: {
          expected_answer_context?: string | null
          id?: string
          module_id?: string | null
          question: string
        }
        Update: {
          expected_answer_context?: string | null
          id?: string
          module_id?: string | null
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      edit_requests: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          request_month: string
          requested_by: string | null
          venue_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          request_month: string
          requested_by?: string | null
          venue_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          request_month?: string
          requested_by?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edit_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edit_requests_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      esignatures: {
        Row: {
          device_info: string | null
          id: string
          ip_address: string | null
          module_id: string | null
          signed_at: string | null
          typed_name: string
          user_id: string | null
        }
        Insert: {
          device_info?: string | null
          id?: string
          ip_address?: string | null
          module_id?: string | null
          signed_at?: string | null
          typed_name: string
          user_id?: string | null
        }
        Update: {
          device_info?: string | null
          id?: string
          ip_address?: string | null
          module_id?: string | null
          signed_at?: string | null
          typed_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "esignatures_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "esignatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_chunks: {
        Row: {
          content_chunk: string
          embedding: string | null
          id: string
          source_module_id: string | null
          venue_id: string | null
        }
        Insert: {
          content_chunk: string
          embedding?: string | null
          id?: string
          source_module_id?: string | null
          venue_id?: string | null
        }
        Update: {
          content_chunk?: string
          embedding?: string | null
          id?: string
          source_module_id?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_source_module_id_fkey"
            columns: ["source_module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      module_sections: {
        Row: {
          content: string | null
          id: string
          module_id: string | null
          photo_refs: string[] | null
          section_order: number
          video_ref: string | null
        }
        Insert: {
          content?: string | null
          id?: string
          module_id?: string | null
          photo_refs?: string[] | null
          section_order: number
          video_ref?: string | null
        }
        Update: {
          content?: string | null
          id?: string
          module_id?: string | null
          photo_refs?: string[] | null
          section_order?: number
          video_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_sections_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string | null
          created_from_sop_ids: string[] | null
          id: string
          role_id: string | null
          status: string | null
          title: string
          venue_id: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_from_sop_ids?: string[] | null
          id?: string
          role_id?: string | null
          status?: string | null
          title: string
          venue_id?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_from_sop_ids?: string[] | null
          id?: string
          role_id?: string | null
          status?: string | null
          title?: string
          venue_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_source_documents: {
        Row: {
          file_ref: string | null
          id: string
          processed_status: string | null
          raw_content: string | null
          uploaded_at: string | null
          venue_id: string | null
        }
        Insert: {
          file_ref?: string | null
          id?: string
          processed_status?: string | null
          raw_content?: string | null
          uploaded_at?: string | null
          venue_id?: string | null
        }
        Update: {
          file_ref?: string | null
          id?: string
          processed_status?: string | null
          raw_content?: string | null
          uploaded_at?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sop_source_documents_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_certificates: {
        Row: {
          certificate_type_id: string | null
          expiry_date: string | null
          id: string
          issued_date: string | null
          photo_ref: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          certificate_type_id?: string | null
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          photo_ref?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          certificate_type_id?: string | null
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          photo_ref?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_certificates_certificate_type_id_fkey"
            columns: ["certificate_type_id"]
            isOneToOne: false
            referencedRelation: "certificate_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_module_progress: {
        Row: {
          completed_at: string | null
          esignature_id: string | null
          id: string
          module_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          esignature_id?: string | null
          id?: string
          module_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          esignature_id?: string | null
          id?: string
          module_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_module_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_module_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_roles: {
        Row: {
          id: string
          name: string
          venue_id: string | null
        }
        Insert: {
          id?: string
          name: string
          venue_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_roles_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          branding: Json | null
          cert_nudge_cadence: number[] | null
          created_at: string | null
          id: string
          monthly_tier: string | null
          multi_venue_group_id: string | null
          name: string
          slug: string | null
        }
        Insert: {
          branding?: Json | null
          cert_nudge_cadence?: number[] | null
          created_at?: string | null
          id?: string
          monthly_tier?: string | null
          multi_venue_group_id?: string | null
          name: string
          slug?: string | null
        }
        Update: {
          branding?: Json | null
          cert_nudge_cadence?: number[] | null
          created_at?: string | null
          id?: string
          monthly_tier?: string | null
          multi_venue_group_id?: string | null
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_owner: {
        Args: {
          p_auth_id: string
          p_owner_email: string
          p_owner_name: string
          p_venue_name: string
          p_venue_slug: string
        }
        Returns: Json
      }
      venue_roster: { Args: { p_slug: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
