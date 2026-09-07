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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          auth_id: string | null
          created_at: string | null
          email: string | null
          has_seen_ask_larder_intro: boolean
          id: string
          name: string
          onboarding_completed_at: string | null
          phone: string | null
          pin_failed_attempts: number | null
          pin_hash: string | null
          pin_locked_until: string | null
          pin_set_at: string | null
          role: string
          staff_role_id: string | null
          venue_id: string | null
          voice_output_enabled: boolean
        }
        Insert: {
          auth_id?: string | null
          created_at?: string | null
          email?: string | null
          has_seen_ask_larder_intro?: boolean
          id?: string
          name: string
          onboarding_completed_at?: string | null
          phone?: string | null
          pin_failed_attempts?: number | null
          pin_hash?: string | null
          pin_locked_until?: string | null
          pin_set_at?: string | null
          role: string
          staff_role_id?: string | null
          venue_id?: string | null
          voice_output_enabled?: boolean
        }
        Update: {
          auth_id?: string | null
          created_at?: string | null
          email?: string | null
          has_seen_ask_larder_intro?: boolean
          id?: string
          name?: string
          onboarding_completed_at?: string | null
          phone?: string | null
          pin_failed_attempts?: number | null
          pin_hash?: string | null
          pin_locked_until?: string | null
          pin_set_at?: string | null
          role?: string
          staff_role_id?: string | null
          venue_id?: string | null
          voice_output_enabled?: boolean
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
      cert_nudge_log: {
        Row: {
          cadence_days: number
          id: string
          sent_at: string | null
          staff_certificate_id: string | null
        }
        Insert: {
          cadence_days: number
          id?: string
          sent_at?: string | null
          staff_certificate_id?: string | null
        }
        Update: {
          cadence_days?: number
          id?: string
          sent_at?: string | null
          staff_certificate_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cert_nudge_log_staff_certificate_id_fkey"
            columns: ["staff_certificate_id"]
            isOneToOne: false
            referencedRelation: "staff_certificates"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_type_roles: {
        Row: {
          certificate_type_id: string
          role_id: string
        }
        Insert: {
          certificate_type_id: string
          role_id: string
        }
        Update: {
          certificate_type_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_type_roles_certificate_type_id_fkey"
            columns: ["certificate_type_id"]
            isOneToOne: false
            referencedRelation: "certificate_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_type_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
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
          escalation_status: string | null
          id: string
          is_escalation: boolean | null
          message: string
          retrieved_chunk_ids: string[] | null
          role: string
          station_id: string | null
          user_id: string | null
          venue_id: string | null
        }
        Insert: {
          created_at?: string | null
          escalation_status?: string | null
          id?: string
          is_escalation?: boolean | null
          message: string
          retrieved_chunk_ids?: string[] | null
          role: string
          station_id?: string | null
          user_id?: string | null
          venue_id?: string | null
        }
        Update: {
          created_at?: string | null
          escalation_status?: string | null
          id?: string
          is_escalation?: boolean | null
          message?: string
          retrieved_chunk_ids?: string[] | null
          role?: string
          station_id?: string | null
          user_id?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
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
          correct_option_index: number | null
          expected_answer_context: string | null
          id: string
          module_id: string | null
          options: Json
          question: string
          section_order: number | null
        }
        Insert: {
          correct_option_index?: number | null
          expected_answer_context?: string | null
          id?: string
          module_id?: string | null
          options?: Json
          question: string
          section_order?: number | null
        }
        Update: {
          correct_option_index?: number | null
          expected_answer_context?: string | null
          id?: string
          module_id?: string | null
          options?: Json
          question?: string
          section_order?: number | null
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
          is_restricted: boolean | null
          source_module_id: string | null
          venue_id: string | null
        }
        Insert: {
          content_chunk: string
          embedding?: string | null
          id?: string
          is_restricted?: boolean | null
          source_module_id?: string | null
          venue_id?: string | null
        }
        Update: {
          content_chunk?: string
          embedding?: string | null
          id?: string
          is_restricted?: boolean | null
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
      menu_item_modifier_groups: {
        Row: {
          created_at: string | null
          id: string
          menu_item_id: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_modifier_groups_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_modifiers: {
        Row: {
          allergens_added: string[] | null
          allergens_removed: string[] | null
          created_at: string | null
          id: string
          modifier_group_id: string | null
          name: string
        }
        Insert: {
          allergens_added?: string[] | null
          allergens_removed?: string[] | null
          created_at?: string | null
          id?: string
          modifier_group_id?: string | null
          name: string
        }
        Update: {
          allergens_added?: string[] | null
          allergens_removed?: string[] | null
          created_at?: string | null
          id?: string
          modifier_group_id?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_modifiers_modifier_group_id_fkey"
            columns: ["modifier_group_id"]
            isOneToOne: false
            referencedRelation: "menu_item_modifier_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          base_allergens: string[] | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          venue_id: string | null
        }
        Insert: {
          base_allergens?: string[] | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          venue_id?: string | null
        }
        Update: {
          base_allergens?: string[] | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      module_roles: {
        Row: {
          id: string
          module_id: string | null
          role_id: string | null
        }
        Insert: {
          id?: string
          module_id?: string | null
          role_id?: string | null
        }
        Update: {
          id?: string
          module_id?: string | null
          role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_roles_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_sections: {
        Row: {
          content: string | null
          id: string
          is_restricted: boolean | null
          module_id: string | null
          photo_refs: string[] | null
          section_order: number
          video_ref: string | null
        }
        Insert: {
          content?: string | null
          id?: string
          is_restricted?: boolean | null
          module_id?: string | null
          photo_refs?: string[] | null
          section_order: number
          video_ref?: string | null
        }
        Update: {
          content?: string | null
          id?: string
          is_restricted?: boolean | null
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
      module_versions: {
        Row: {
          changelog: string | null
          id: string
          module_id: string | null
          published_at: string | null
          version: number
        }
        Insert: {
          changelog?: string | null
          id?: string
          module_id?: string | null
          published_at?: string | null
          version: number
        }
        Update: {
          changelog?: string | null
          id?: string
          module_id?: string | null
          published_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "module_versions_module_id_fkey"
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
          status: string | null
          title: string
          venue_id: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_from_sop_ids?: string[] | null
          id?: string
          status?: string | null
          title: string
          venue_id?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_from_sop_ids?: string[] | null
          id?: string
          status?: string | null
          title?: string
          venue_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      near_miss_reports: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_anonymous: boolean | null
          photo_ref: string | null
          reported_by: string | null
          station_id: string | null
          status: string | null
          venue_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_anonymous?: boolean | null
          photo_ref?: string | null
          reported_by?: string | null
          station_id?: string | null
          status?: string | null
          venue_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_anonymous?: boolean | null
          photo_ref?: string | null
          reported_by?: string | null
          station_id?: string | null
          status?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "near_miss_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "near_miss_reports_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "near_miss_reports_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_content_checks: {
        Row: {
          answer: string | null
          could_answer: boolean | null
          created_at: string | null
          id: string
          module_id: string | null
          self_consistency_checked: boolean
          test_question: string | null
          topic_key: string | null
          venue_id: string | null
        }
        Insert: {
          answer?: string | null
          could_answer?: boolean | null
          created_at?: string | null
          id?: string
          module_id?: string | null
          self_consistency_checked?: boolean
          test_question?: string | null
          topic_key?: string | null
          venue_id?: string | null
        }
        Update: {
          answer?: string | null
          could_answer?: boolean | null
          created_at?: string | null
          id?: string
          module_id?: string | null
          self_consistency_checked?: boolean
          test_question?: string | null
          topic_key?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_content_checks_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_content_checks_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_library: {
        Row: {
          created_at: string | null
          id: string
          module_id: string | null
          station_id: string | null
          storage_path: string
          tag: string
          uploaded_by: string | null
          venue_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          module_id?: string | null
          station_id?: string | null
          storage_path: string
          tag: string
          uploaded_by?: string | null
          venue_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          module_id?: string | null
          station_id?: string | null
          storage_path?: string
          tag?: string
          uploaded_by?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_library_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_library_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_library_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_library_venue_id_fkey"
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
      staff_module_acknowledgements: {
        Row: {
          acknowledged_at: string | null
          id: string
          module_version_id: string | null
          user_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          id?: string
          module_version_id?: string | null
          user_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          id?: string
          module_version_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_module_acknowledgements_module_version_id_fkey"
            columns: ["module_version_id"]
            isOneToOne: false
            referencedRelation: "module_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_module_acknowledgements_user_id_fkey"
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
            foreignKeyName: "staff_module_progress_esignature_id_fkey"
            columns: ["esignature_id"]
            isOneToOne: false
            referencedRelation: "esignatures"
            referencedColumns: ["id"]
          },
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
          department: string | null
          fallback_tier: string | null
          id: string
          name: string
          venue_id: string | null
        }
        Insert: {
          department?: string | null
          fallback_tier?: string | null
          id?: string
          name: string
          venue_id?: string | null
        }
        Update: {
          department?: string | null
          fallback_tier?: string | null
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
      stations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          primary_module_id: string | null
          qr_code_slug: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          primary_module_id?: string | null
          qr_code_slug: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          primary_module_id?: string | null
          qr_code_slug?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stations_primary_module_id_fkey"
            columns: ["primary_module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_contacts: {
        Row: {
          contact_type: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          venue_id: string | null
        }
        Insert: {
          contact_type?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          venue_id?: string | null
        }
        Update: {
          contact_type?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_contacts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_key_roles: {
        Row: {
          app_user_id: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          role_type: string
          venue_id: string | null
        }
        Insert: {
          app_user_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          role_type: string
          venue_id?: string | null
        }
        Update: {
          app_user_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role_type?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_key_roles_app_user_id_fkey"
            columns: ["app_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_key_roles_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_licence_profile: {
        Row: {
          abn: string | null
          address: string | null
          approved_trading_hours: Json | null
          conditions: string | null
          created_at: string | null
          id: string
          late_night_endorsement: boolean | null
          legal_name: string | null
          licence_number: string | null
          licence_status: string | null
          licence_type: string | null
          licensed_capacity: number | null
          state: string | null
          venue_id: string | null
        }
        Insert: {
          abn?: string | null
          address?: string | null
          approved_trading_hours?: Json | null
          conditions?: string | null
          created_at?: string | null
          id?: string
          late_night_endorsement?: boolean | null
          legal_name?: string | null
          licence_number?: string | null
          licence_status?: string | null
          licence_type?: string | null
          licensed_capacity?: number | null
          state?: string | null
          venue_id?: string | null
        }
        Update: {
          abn?: string | null
          address?: string | null
          approved_trading_hours?: Json | null
          conditions?: string | null
          created_at?: string | null
          id?: string
          late_night_endorsement?: boolean | null
          legal_name?: string | null
          licence_number?: string | null
          licence_status?: string | null
          licence_type?: string | null
          licensed_capacity?: number | null
          state?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_licence_profile_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_promotions: {
        Row: {
          created_at: string | null
          day_of_week: string
          description: string | null
          end_time: string
          id: string
          start_time: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: string
          description?: string | null
          end_time: string
          id?: string
          start_time: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: string
          description?: string | null
          end_time?: string
          id?: string
          start_time?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_promotions_venue_id_fkey"
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
          roster_location: string | null
          shift_windows: Json | null
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
          roster_location?: string | null
          shift_windows?: Json | null
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
          roster_location?: string | null
          shift_windows?: Json | null
          slug?: string | null
        }
        Relationships: []
      }
      wizard_sessions: {
        Row: {
          current_step: string | null
          id: string
          started_at: string | null
          started_by: string | null
          status: string
          updated_at: string | null
          venue_id: string | null
          venue_type_flags: Json
        }
        Insert: {
          current_step?: string | null
          id?: string
          started_at?: string | null
          started_by?: string | null
          status?: string
          updated_at?: string | null
          venue_id?: string | null
          venue_type_flags?: Json
        }
        Update: {
          current_step?: string | null
          id?: string
          started_at?: string | null
          started_by?: string | null
          status?: string
          updated_at?: string | null
          venue_id?: string | null
          venue_type_flags?: Json
        }
        Relationships: [
          {
            foreignKeyName: "wizard_sessions_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wizard_sessions_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
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
      complete_onboarding_signature: {
        Args: { p_device: string; p_ip: string; p_typed_name: string }
        Returns: Json
      }
      match_knowledge_chunks: {
        Args: { p_match_count?: number; p_query_embedding: string }
        Returns: {
          content_chunk: string
          id: string
          is_restricted: boolean
          similarity: number
          source_module_id: string
        }[]
      }
      match_knowledge_chunks_for_authoring: {
        Args: {
          p_match_count?: number
          p_query_embedding: string
          p_source_module_id: string
        }
        Returns: {
          content_chunk: string
          id: string
          is_restricted: boolean
          similarity: number
        }[]
      }
      publish_module_version: {
        Args: { p_changelog?: string; p_module_id: string }
        Returns: string
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
