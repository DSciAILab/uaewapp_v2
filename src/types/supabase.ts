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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      accommodation_bookings: {
        Row: {
          assigned_to: string | null
          check_in_date: string
          check_out_date: string
          confirmation_number: string | null
          cost_per_night_usd: number | null
          created_at: string | null
          hotel_name: string | null
          id: string
          roster_entry_id: string
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          check_in_date: string
          check_out_date: string
          confirmation_number?: string | null
          cost_per_night_usd?: number | null
          created_at?: string | null
          hotel_name?: string | null
          id?: string
          roster_entry_id: string
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          check_in_date?: string
          check_out_date?: string
          confirmation_number?: string | null
          cost_per_night_usd?: number | null
          created_at?: string | null
          hotel_name?: string | null
          id?: string
          roster_entry_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_bookings_roster_entry_id_fkey"
            columns: ["roster_entry_id"]
            isOneToOne: false
            referencedRelation: "event_roster"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          category: string
          code: string
          color: string
          created_at: string | null
          description: string
          icon: string
          id: string
          is_secret: boolean | null
          points_reward: number | null
          requirement_type: string
          requirement_value: number
          title: string
        }
        Insert: {
          category: string
          code: string
          color: string
          created_at?: string | null
          description: string
          icon: string
          id?: string
          is_secret?: boolean | null
          points_reward?: number | null
          requirement_type: string
          requirement_value: number
          title: string
        }
        Update: {
          category?: string
          code?: string
          color?: string
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          is_secret?: boolean | null
          points_reward?: number | null
          requirement_type?: string
          requirement_value?: number
          title?: string
        }
        Relationships: []
      }
      actions: {
        Row: {
          app_id: string
          created_at: string | null
          event_id: string
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          app_id?: string
          created_at?: string | null
          event_id: string
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string | null
          event_id?: string
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actions_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sjjp_events"
            referencedColumns: ["id"]
          },
        ]
      }
      af_access_grants: {
        Row: {
          active: boolean | null
          created_at: string
          id: string
          patient_id: string
          psychologist_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          id?: string
          patient_id: string
          psychologist_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          id?: string
          patient_id?: string
          psychologist_id?: string
        }
        Relationships: []
      }
      af_comments: {
        Row: {
          created_at: string
          id: string
          task_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          task_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          task_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "af_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "af_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      af_mood_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          mood_score: number
          notes: string | null
          primary_emotion: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          mood_score: number
          notes?: string | null
          primary_emotion: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          mood_score?: number
          notes?: string | null
          primary_emotion?: string
          user_id?: string
        }
        Relationships: []
      }
      af_profiles: {
        Row: {
          avatar: string | null
          bio: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          role: string | null
        }
        Insert: {
          avatar?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          role?: string | null
        }
        Update: {
          avatar?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          role?: string | null
        }
        Relationships: []
      }
      af_rpd: {
        Row: {
          automatic_thoughts: string
          cognitive_distortions: string | null
          created_at: string
          date: string
          emotional_response: string
          id: string
          outcome: string
          rational_response: string
          situation: string
          user_id: string
        }
        Insert: {
          automatic_thoughts: string
          cognitive_distortions?: string | null
          created_at?: string
          date?: string
          emotional_response: string
          id?: string
          outcome: string
          rational_response: string
          situation: string
          user_id: string
        }
        Update: {
          automatic_thoughts?: string
          cognitive_distortions?: string | null
          created_at?: string
          date?: string
          emotional_response?: string
          id?: string
          outcome?: string
          rational_response?: string
          situation?: string
          user_id?: string
        }
        Relationships: []
      }
      af_sessions: {
        Row: {
          created_at: string
          date: string
          id: string
          summary: string | null
          title: string
          transcription: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          summary?: string | null
          title: string
          transcription?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          summary?: string | null
          title?: string
          transcription?: string | null
          user_id?: string
        }
        Relationships: []
      }
      af_tasks: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          session_id: string | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          session_id?: string | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          session_id?: string | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "af_tasks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "af_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          app_id: string
          created_at: string | null
          event_id: string | null
          event_time: string | null
          id: string
          is_active: boolean | null
          is_mandatory_for_all: boolean | null
          notes: string | null
          required_personnel: string[] | null
          title: string
          user_id: string
        }
        Insert: {
          app_id?: string
          created_at?: string | null
          event_id?: string | null
          event_time?: string | null
          id?: string
          is_active?: boolean | null
          is_mandatory_for_all?: boolean | null
          notes?: string | null
          required_personnel?: string[] | null
          title: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string | null
          event_id?: string | null
          event_time?: string | null
          id?: string
          is_active?: boolean | null
          is_mandatory_for_all?: boolean | null
          notes?: string | null
          required_personnel?: string[] | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          app_id: string
          created_at: string | null
          key: string
          updated_at: string | null
          user_id: string
          value: string | null
        }
        Insert: {
          app_id: string
          created_at?: string | null
          key: string
          updated_at?: string | null
          user_id: string
          value?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string | null
          key?: string
          updated_at?: string | null
          user_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_config_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      boolean_habit_checks: {
        Row: {
          check_date: string
          created_at: string | null
          habit_id: string
          id: number
          is_checked: boolean | null
          user_id: string
        }
        Insert: {
          check_date: string
          created_at?: string | null
          habit_id: string
          id?: number
          is_checked?: boolean | null
          user_id: string
        }
        Update: {
          check_date?: string
          created_at?: string | null
          habit_id?: string
          id?: number
          is_checked?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boolean_habit_checks_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      break_logs: {
        Row: {
          app_id: string
          created_at: string | null
          duration_seconds: number
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          app_id?: string
          created_at?: string | null
          duration_seconds: number
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string | null
          duration_seconds?: number
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "break_logs_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "break_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      check_in_log: {
        Row: {
          app_id: string
          check_in_number: number
          check_in_time: string
          check_out_time: string | null
          created_at: string | null
          event_id: string
          id: string
          personnel_id: string
          status: Database["public"]["Enums"]["check_in_status"]
          sub_event_id: string
          user_id: string | null
        }
        Insert: {
          app_id?: string
          check_in_number: number
          check_in_time?: string
          check_out_time?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          personnel_id: string
          status?: Database["public"]["Enums"]["check_in_status"]
          sub_event_id: string
          user_id?: string | null
        }
        Update: {
          app_id?: string
          check_in_number?: number
          check_in_time?: string
          check_out_time?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          personnel_id?: string
          status?: Database["public"]["Enums"]["check_in_status"]
          sub_event_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_in_log_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_in_log_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_in_log_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: false
            referencedRelation: "sub_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_logs: {
        Row: {
          app_id: string
          created_at: string | null
          event_id: string
          id: string
          notes: string | null
          personnel_id: string | null
          status: string | null
          sub_event_id: string | null
          task_id: string | null
          user_id: string | null
        }
        Insert: {
          app_id?: string
          created_at?: string | null
          event_id: string
          id?: string
          notes?: string | null
          personnel_id?: string | null
          status?: string | null
          sub_event_id?: string | null
          task_id?: string | null
          user_id?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string | null
          event_id?: string
          id?: string
          notes?: string | null
          personnel_id?: string | null
          status?: string | null
          sub_event_id?: string | null
          task_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_logs_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: false
            referencedRelation: "sub_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_personnel_link: {
        Row: {
          app_id: string
          created_at: string | null
          event_id: string
          personnel_id: string
        }
        Insert: {
          app_id?: string
          created_at?: string | null
          event_id: string
          personnel_id: string
        }
        Update: {
          app_id?: string
          created_at?: string | null
          event_id?: string
          personnel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_personnel_link_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_personnel_link_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sjjp_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_personnel_link_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      event_roster: {
        Row: {
          associated_fighter_id: string | null
          created_at: string | null
          event_code: string
          id: string
          needs_accommodation: boolean | null
          needs_flight: boolean | null
          needs_transport: boolean | null
          needs_visa: boolean | null
          notes: string | null
          person_id: string
          role: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          associated_fighter_id?: string | null
          created_at?: string | null
          event_code: string
          id?: string
          needs_accommodation?: boolean | null
          needs_flight?: boolean | null
          needs_transport?: boolean | null
          needs_visa?: boolean | null
          notes?: string | null
          person_id: string
          role: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          associated_fighter_id?: string | null
          created_at?: string | null
          event_code?: string
          id?: string
          needs_accommodation?: boolean | null
          needs_flight?: boolean | null
          needs_transport?: boolean | null
          needs_visa?: boolean | null
          notes?: string | null
          person_id?: string
          role?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_roster_associated_fighter_id_fkey"
            columns: ["associated_fighter_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_roster_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      fights: {
        Row: {
          app_id: string
          created_at: string | null
          event_id: string
          fight_order: number
          fighter1_id: string | null
          fighter1_room_status: boolean | null
          fighter2_id: string | null
          fighter2_room_status: boolean | null
          id: string
          is_title_fight: boolean | null
          notes: string | null
          rounds: number | null
          user_id: string | null
          weight_class: string | null
        }
        Insert: {
          app_id?: string
          created_at?: string | null
          event_id: string
          fight_order: number
          fighter1_id?: string | null
          fighter1_room_status?: boolean | null
          fighter2_id?: string | null
          fighter2_room_status?: boolean | null
          id?: string
          is_title_fight?: boolean | null
          notes?: string | null
          rounds?: number | null
          user_id?: string | null
          weight_class?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string | null
          event_id?: string
          fight_order?: number
          fighter1_id?: string | null
          fighter1_room_status?: boolean | null
          fighter2_id?: string | null
          fighter2_room_status?: boolean | null
          id?: string
          is_title_fight?: boolean | null
          notes?: string | null
          rounds?: number | null
          user_id?: string | null
          weight_class?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fights_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fights_fighter1_id_fkey"
            columns: ["fighter1_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fights_fighter2_id_fkey"
            columns: ["fighter2_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_portal_refresh: {
        Row: {
          id: number
          requested_at: string
          requested_by: string | null
        }
        Insert: {
          id?: number
          requested_at?: string
          requested_by?: string | null
        }
        Update: {
          id?: number
          requested_at?: string
          requested_by?: string | null
        }
        Relationships: []
      }
      flight_bookings: {
        Row: {
          assigned_to: string | null
          cost_usd: number | null
          created_at: string | null
          id: string
          outbound_arrival_datetime: string | null
          outbound_departure_datetime: string | null
          outbound_flight_number: string | null
          pnr: string | null
          return_departure_datetime: string | null
          return_flight_number: string | null
          roster_entry_id: string
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          cost_usd?: number | null
          created_at?: string | null
          id?: string
          outbound_arrival_datetime?: string | null
          outbound_departure_datetime?: string | null
          outbound_flight_number?: string | null
          pnr?: string | null
          return_departure_datetime?: string | null
          return_flight_number?: string | null
          roster_entry_id: string
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          cost_usd?: number | null
          created_at?: string | null
          id?: string
          outbound_arrival_datetime?: string | null
          outbound_departure_datetime?: string | null
          outbound_flight_number?: string | null
          pnr?: string | null
          return_departure_datetime?: string | null
          return_flight_number?: string | null
          roster_entry_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flight_bookings_roster_entry_id_fkey"
            columns: ["roster_entry_id"]
            isOneToOne: false
            referencedRelation: "event_roster"
            referencedColumns: ["id"]
          },
        ]
      }
      ft_drive_tickets: {
        Row: {
          allocated_to: string | null
          delivered_at: string | null
          drive_file_id: string
          event_id: string
          file_name: string
          id: string
          public_url: string
          status: string
          synced_at: string
          ticket_id: string | null
          tier: string
        }
        Insert: {
          allocated_to?: string | null
          delivered_at?: string | null
          drive_file_id: string
          event_id: string
          file_name: string
          id?: string
          public_url: string
          status: string
          synced_at?: string
          ticket_id?: string | null
          tier: string
        }
        Update: {
          allocated_to?: string | null
          delivered_at?: string | null
          drive_file_id?: string
          event_id?: string
          file_name?: string
          id?: string
          public_url?: string
          status?: string
          synced_at?: string
          ticket_id?: string | null
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "ft_drive_tickets_allocated_to_fkey"
            columns: ["allocated_to"]
            isOneToOne: false
            referencedRelation: "ft_event_fighters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ft_drive_tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "ft_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ft_drive_tickets_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ft_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ft_event_fighters: {
        Row: {
          athlete_id: string | null
          corner: string
          created_at: string
          date_of_birth: string
          division: string | null
          event_id: string
          fight_order: number
          full_name: string
          id: string
          mobile: string | null
          mobile_last4: string | null
          picture_url: string | null
          ticket_cap_override_bronze: number | null
          ticket_cap_override_gold: number | null
          ticket_cap_override_platinum: number | null
          ticket_cap_override_silver: number | null
        }
        Insert: {
          athlete_id?: string | null
          corner: string
          created_at?: string
          date_of_birth: string
          division?: string | null
          event_id: string
          fight_order: number
          full_name: string
          id?: string
          mobile?: string | null
          mobile_last4?: string | null
          picture_url?: string | null
          ticket_cap_override_bronze?: number | null
          ticket_cap_override_gold?: number | null
          ticket_cap_override_platinum?: number | null
          ticket_cap_override_silver?: number | null
        }
        Update: {
          athlete_id?: string | null
          corner?: string
          created_at?: string
          date_of_birth?: string
          division?: string | null
          event_id?: string
          fight_order?: number
          full_name?: string
          id?: string
          mobile?: string | null
          mobile_last4?: string | null
          picture_url?: string | null
          ticket_cap_override_bronze?: number | null
          ticket_cap_override_gold?: number | null
          ticket_cap_override_platinum?: number | null
          ticket_cap_override_silver?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ft_event_fighters_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "ft_events"
            referencedColumns: ["id"]
          },
        ]
      }
      ft_events: {
        Row: {
          code: string
          created_at: string
          drive_folder_id: string | null
          event_date: string
          id: string
          is_active: boolean
          name: string
          ticket_default_cap_bronze: number
          ticket_default_cap_gold: number
          ticket_default_cap_platinum: number
          ticket_default_cap_silver: number
          ticket_edit_deadline: string
          venue: string | null
        }
        Insert: {
          code: string
          created_at?: string
          drive_folder_id?: string | null
          event_date: string
          id?: string
          is_active?: boolean
          name: string
          ticket_default_cap_bronze?: number
          ticket_default_cap_gold?: number
          ticket_default_cap_platinum?: number
          ticket_default_cap_silver?: number
          ticket_edit_deadline: string
          venue?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          drive_folder_id?: string | null
          event_date?: string
          id?: string
          is_active?: boolean
          name?: string
          ticket_default_cap_bronze?: number
          ticket_default_cap_gold?: number
          ticket_default_cap_platinum?: number
          ticket_default_cap_silver?: number
          ticket_edit_deadline?: string
          venue?: string | null
        }
        Relationships: []
      }
      ft_ticket_requests: {
        Row: {
          created_at: string
          event_fighter_id: string
          id: string
          requested_qty: number
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_fighter_id: string
          id?: string
          requested_qty: number
          tier: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_fighter_id?: string
          id?: string
          requested_qty?: number
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ft_ticket_requests_event_fighter_id_fkey"
            columns: ["event_fighter_id"]
            isOneToOne: false
            referencedRelation: "ft_event_fighters"
            referencedColumns: ["id"]
          },
        ]
      }
      ft_tickets: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          drive_ticket_id: string | null
          event_fighter_id: string
          id: string
          status: string
          ticket_number: number
          ticket_request_id: string
          tier: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          drive_ticket_id?: string | null
          event_fighter_id: string
          id?: string
          status: string
          ticket_number: number
          ticket_request_id: string
          tier: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          drive_ticket_id?: string | null
          event_fighter_id?: string
          id?: string
          status?: string
          ticket_number?: number
          ticket_request_id?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "ft_tickets_drive_ticket_fk"
            columns: ["drive_ticket_id"]
            isOneToOne: false
            referencedRelation: "ft_drive_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ft_tickets_event_fighter_id_fkey"
            columns: ["event_fighter_id"]
            isOneToOne: false
            referencedRelation: "ft_event_fighters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ft_tickets_ticket_request_id_fkey"
            columns: ["ticket_request_id"]
            isOneToOne: false
            referencedRelation: "ft_ticket_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ground_transport: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          driver_name: string | null
          driver_phone: string | null
          dropoff_location: string | null
          flight_booking_id: string | null
          id: string
          pickup_location: string | null
          roster_entry_id: string
          scheduled_datetime: string | null
          status: string | null
          transport_type: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          dropoff_location?: string | null
          flight_booking_id?: string | null
          id?: string
          pickup_location?: string | null
          roster_entry_id: string
          scheduled_datetime?: string | null
          status?: string | null
          transport_type?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          dropoff_location?: string | null
          flight_booking_id?: string | null
          id?: string
          pickup_location?: string | null
          roster_entry_id?: string
          scheduled_datetime?: string | null
          status?: string | null
          transport_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ground_transport_flight_booking_id_fkey"
            columns: ["flight_booking_id"]
            isOneToOne: false
            referencedRelation: "flight_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ground_transport_roster_entry_id_fkey"
            columns: ["roster_entry_id"]
            isOneToOne: false
            referencedRelation: "event_roster"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          completed: boolean
          created_at: string
          habit_id: string
          id: string
          log_date: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          habit_id: string
          id?: string
          log_date?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          habit_id?: string
          id?: string
          log_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          app_id: string
          created_at: string | null
          goal_unit: string | null
          goal_value: number | null
          hashtags: string[] | null
          id: string
          increment_value: number | null
          project: string | null
          project_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          app_id: string
          created_at?: string | null
          goal_unit?: string | null
          goal_value?: number | null
          hashtags?: string[] | null
          id?: string
          increment_value?: number | null
          project?: string | null
          project_id?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string | null
          goal_unit?: string | null
          goal_value?: number | null
          hashtags?: string[] | null
          id?: string
          increment_value?: number | null
          project?: string | null
          project_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habits_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      hea_clinical_event: {
        Row: {
          content: string
          id: number
          source: string
          thread_id: number | null
          ts: string
          type: string
        }
        Insert: {
          content: string
          id?: never
          source?: string
          thread_id?: number | null
          ts?: string
          type: string
        }
        Update: {
          content?: string
          id?: never
          source?: string
          thread_id?: number | null
          ts?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "hea_clinical_event_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "hea_clinical_thread"
            referencedColumns: ["id"]
          },
        ]
      }
      hea_clinical_thread: {
        Row: {
          category: string | null
          id: number
          opened_at: string
          resolved_at: string | null
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          id?: never
          opened_at?: string
          resolved_at?: string | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          id?: never
          opened_at?: string
          resolved_at?: string | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      import_column_mappings: {
        Row: {
          created_at: string | null
          file_type: string
          headers_hash: string
          id: string
          last_url: string | null
          mapping: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          file_type: string
          headers_hash: string
          id?: string
          last_url?: string | null
          mapping: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          file_type?: string
          headers_hash?: string
          id?: string
          last_url?: string | null
          mapping?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      jud_activity_log: {
        Row: {
          action: string
          details: string | null
          id: string
          skill_name: string | null
          source: string
          status: string | null
          timestamp: string | null
        }
        Insert: {
          action: string
          details?: string | null
          id?: string
          skill_name?: string | null
          source: string
          status?: string | null
          timestamp?: string | null
        }
        Update: {
          action?: string
          details?: string | null
          id?: string
          skill_name?: string | null
          source?: string
          status?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      jud_daily_briefs: {
        Row: {
          calendar_summary: string | null
          created_at: string | null
          date: string
          id: string
          medications_status: Json | null
          priorities: Json | null
          summary: string | null
          updated_at: string | null
          weight_today: number | null
        }
        Insert: {
          calendar_summary?: string | null
          created_at?: string | null
          date: string
          id?: string
          medications_status?: Json | null
          priorities?: Json | null
          summary?: string | null
          updated_at?: string | null
          weight_today?: number | null
        }
        Update: {
          calendar_summary?: string | null
          created_at?: string | null
          date?: string
          id?: string
          medications_status?: Json | null
          priorities?: Json | null
          summary?: string | null
          updated_at?: string | null
          weight_today?: number | null
        }
        Relationships: []
      }
      jud_health_logs: {
        Row: {
          created_at: string | null
          date: string
          id: string
          medications_taken: Json | null
          notes: string | null
          sleep_hours: number | null
          water_ml: number | null
          weight_kg: number | null
          workout_duration_min: number | null
          workout_type: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          medications_taken?: Json | null
          notes?: string | null
          sleep_hours?: number | null
          water_ml?: number | null
          weight_kg?: number | null
          workout_duration_min?: number | null
          workout_type?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          medications_taken?: Json | null
          notes?: string | null
          sleep_hours?: number | null
          water_ml?: number | null
          weight_kg?: number | null
          workout_duration_min?: number | null
          workout_type?: string | null
        }
        Relationships: []
      }
      jud_projects: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          status: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          status?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          status?: string | null
        }
        Relationships: []
      }
      jud_skill_runs: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          error_message: string | null
          file_bytes: number | null
          finished_at: string | null
          id: string
          notes: string | null
          output_url: string | null
          rows_count: number | null
          script_name: string | null
          skill_name: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          file_bytes?: number | null
          finished_at?: string | null
          id?: string
          notes?: string | null
          output_url?: string | null
          rows_count?: number | null
          script_name?: string | null
          skill_name: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          file_bytes?: number | null
          finished_at?: string | null
          id?: string
          notes?: string | null
          output_url?: string | null
          rows_count?: number | null
          script_name?: string | null
          skill_name?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      jud_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          drive_link: string | null
          due_date: string | null
          id: string
          notion_link: string | null
          priority: string | null
          project_id: string | null
          sort_order: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          drive_link?: string | null
          due_date?: string | null
          id?: string
          notion_link?: string | null
          priority?: string | null
          project_id?: string | null
          sort_order?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          drive_link?: string | null
          due_date?: string | null
          id?: string
          notion_link?: string | null
          priority?: string | null
          project_id?: string | null
          sort_order?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jud_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "jud_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      jud_videos: {
        Row: {
          category: string | null
          channel: string | null
          created_at: string | null
          date: string | null
          id: string
          notes: string | null
          rating: number | null
          tags: string | null
          title: string
          transcription: string | null
          url: string
          watched: boolean | null
        }
        Insert: {
          category?: string | null
          channel?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          notes?: string | null
          rating?: number | null
          tags?: string | null
          title: string
          transcription?: string | null
          url: string
          watched?: boolean | null
        }
        Update: {
          category?: string | null
          channel?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          notes?: string | null
          rating?: number | null
          tags?: string | null
          title?: string
          transcription?: string | null
          url?: string
          watched?: boolean | null
        }
        Relationships: []
      }
      levels: {
        Row: {
          color: string
          icon: string
          level: number
          min_points: number
          title: string
        }
        Insert: {
          color: string
          icon: string
          level: number
          min_points: number
          title: string
        }
        Update: {
          color?: string
          icon?: string
          level?: number
          min_points?: number
          title?: string
        }
        Relationships: []
      }
      mf_annual_goals: {
        Row: {
          area_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          project_id: string | null
          quarter: number | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          area_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          project_id?: string | null
          quarter?: number | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          area_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          project_id?: string | null
          quarter?: number | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "mf_annual_goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "mf_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mf_calendar_events: {
        Row: {
          created_at: string | null
          description: string | null
          end_time: string
          id: string
          related_project_id: string | null
          related_task_id: string | null
          start_time: string
          title: string
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_time: string
          id?: string
          related_project_id?: string | null
          related_task_id?: string | null
          start_time: string
          title: string
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_time?: string
          id?: string
          related_project_id?: string | null
          related_task_id?: string | null
          start_time?: string
          title?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mf_calendar_events_related_project_id_fkey"
            columns: ["related_project_id"]
            isOneToOne: false
            referencedRelation: "mf_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mf_calendar_events_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "mf_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      mf_capture_items: {
        Row: {
          audio_url: string | null
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          processed: boolean
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          processed?: boolean
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_url?: string | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          processed?: boolean
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mf_daily_mission_config: {
        Row: {
          created_at: string | null
          id: string
          include_habits: boolean | null
          max_tasks: number | null
          morning_checkin_enabled: boolean | null
          show_on_startup: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          include_habits?: boolean | null
          max_tasks?: number | null
          morning_checkin_enabled?: boolean | null
          show_on_startup?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          include_habits?: boolean | null
          max_tasks?: number | null
          morning_checkin_enabled?: boolean | null
          show_on_startup?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mf_distractions: {
        Row: {
          captured_during_task_id: string | null
          content: string
          converted_to_task_id: string | null
          created_at: string | null
          focus_session_id: string | null
          id: string
          processed: boolean | null
          processed_at: string | null
          user_id: string
        }
        Insert: {
          captured_during_task_id?: string | null
          content: string
          converted_to_task_id?: string | null
          created_at?: string | null
          focus_session_id?: string | null
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          user_id: string
        }
        Update: {
          captured_during_task_id?: string | null
          content?: string
          converted_to_task_id?: string | null
          created_at?: string | null
          focus_session_id?: string | null
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mf_distractions_captured_during_task_id_fkey"
            columns: ["captured_during_task_id"]
            isOneToOne: false
            referencedRelation: "mf_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mf_distractions_converted_to_task_id_fkey"
            columns: ["converted_to_task_id"]
            isOneToOne: false
            referencedRelation: "mf_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mf_distractions_focus_session_id_fkey"
            columns: ["focus_session_id"]
            isOneToOne: false
            referencedRelation: "mf_focus_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mf_focus_sessions: {
        Row: {
          break_time_minutes: number | null
          completed_at: string | null
          duration_minutes: number
          id: string
          started_at: string
          task_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          break_time_minutes?: number | null
          completed_at?: string | null
          duration_minutes: number
          id?: string
          started_at?: string
          task_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          break_time_minutes?: number | null
          completed_at?: string | null
          duration_minutes?: number
          id?: string
          started_at?: string
          task_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mf_focus_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "mf_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      mf_habit_logs: {
        Row: {
          completed: boolean
          created_at: string
          habit_id: string
          id: string
          log_date: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          habit_id: string
          id?: string
          log_date?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          habit_id?: string
          id?: string
          log_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mf_habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "mf_habits"
            referencedColumns: ["id"]
          },
        ]
      }
      mf_habits: {
        Row: {
          archive_reason: string | null
          archive_status: string | null
          archived_at: string | null
          color: string | null
          created_at: string
          days_of_week: number[] | null
          deleted_at: string | null
          description: string | null
          frequency: string
          icon: string | null
          id: string
          is_active: boolean | null
          project_id: string | null
          reminder_time: string | null
          specific_days: number[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archive_reason?: string | null
          archive_status?: string | null
          archived_at?: string | null
          color?: string | null
          created_at?: string
          days_of_week?: number[] | null
          deleted_at?: string | null
          description?: string | null
          frequency?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          project_id?: string | null
          reminder_time?: string | null
          specific_days?: number[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archive_reason?: string | null
          archive_status?: string | null
          archived_at?: string | null
          color?: string | null
          created_at?: string
          days_of_week?: number[] | null
          deleted_at?: string | null
          description?: string | null
          frequency?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          project_id?: string | null
          reminder_time?: string | null
          specific_days?: number[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mf_habits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "mf_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mf_journal_entries: {
        Row: {
          content: string
          created_at: string
          id: string
          mood: number | null
          tags: string[] | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          mood?: number | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          mood?: number | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mf_morning_checkins: {
        Row: {
          checkin_date: string
          created_at: string | null
          energy_level: number | null
          id: string
          mood_level: number | null
          notes: string | null
          sleep_quality: number | null
          user_id: string
        }
        Insert: {
          checkin_date: string
          created_at?: string | null
          energy_level?: number | null
          id?: string
          mood_level?: number | null
          notes?: string | null
          sleep_quality?: number | null
          user_id: string
        }
        Update: {
          checkin_date?: string
          created_at?: string | null
          energy_level?: number | null
          id?: string
          mood_level?: number | null
          notes?: string | null
          sleep_quality?: number | null
          user_id?: string
        }
        Relationships: []
      }
      mf_notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mf_profiles: {
        Row: {
          ai_persona_config: Json | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          llm_api_key: string | null
          llm_model: string | null
          llm_provider: string | null
          theme: string | null
          timer_break_duration: number | null
          timer_focus_duration: number | null
          updated_at: string
          wheel_of_life_scores: Json | null
        }
        Insert: {
          ai_persona_config?: Json | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          llm_api_key?: string | null
          llm_model?: string | null
          llm_provider?: string | null
          theme?: string | null
          timer_break_duration?: number | null
          timer_focus_duration?: number | null
          updated_at?: string
          wheel_of_life_scores?: Json | null
        }
        Update: {
          ai_persona_config?: Json | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          llm_api_key?: string | null
          llm_model?: string | null
          llm_provider?: string | null
          theme?: string | null
          timer_break_duration?: number | null
          timer_focus_duration?: number | null
          updated_at?: string
          wheel_of_life_scores?: Json | null
        }
        Relationships: []
      }
      mf_projects: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          goal_id: string | null
          id: string
          life_area_id: string | null
          name: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          goal_id?: string | null
          id?: string
          life_area_id?: string | null
          name: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          goal_id?: string | null
          id?: string
          life_area_id?: string | null
          name?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mf_projects_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "mf_annual_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      mf_sketches: {
        Row: {
          canvas_data: string
          created_at: string
          id: string
          thumbnail: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          canvas_data: string
          created_at?: string
          id?: string
          thumbnail?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          canvas_data?: string
          created_at?: string
          id?: string
          thumbnail?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mf_tasks: {
        Row: {
          big3_date: string | null
          completed_at: string | null
          contexts: string[] | null
          created_at: string
          description: string | null
          due_date: string | null
          energy_required: string | null
          estimated_minutes: number | null
          id: string
          is_big3: boolean | null
          parent_task_id: string | null
          points: number | null
          priority: string
          project_id: string | null
          status: string
          tags: string[] | null
          time_required_minutes: number | null
          time_spent_minutes: number | null
          title: string
          user_id: string
        }
        Insert: {
          big3_date?: string | null
          completed_at?: string | null
          contexts?: string[] | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          energy_required?: string | null
          estimated_minutes?: number | null
          id?: string
          is_big3?: boolean | null
          parent_task_id?: string | null
          points?: number | null
          priority?: string
          project_id?: string | null
          status?: string
          tags?: string[] | null
          time_required_minutes?: number | null
          time_spent_minutes?: number | null
          title: string
          user_id: string
        }
        Update: {
          big3_date?: string | null
          completed_at?: string | null
          contexts?: string[] | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          energy_required?: string | null
          estimated_minutes?: number | null
          id?: string
          is_big3?: boolean | null
          parent_task_id?: string | null
          points?: number | null
          priority?: string
          project_id?: string | null
          status?: string
          tags?: string[] | null
          time_required_minutes?: number | null
          time_spent_minutes?: number | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mf_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "mf_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mf_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "mf_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mf_wellness_config: {
        Row: {
          created_at: string | null
          eyes_enabled: boolean | null
          eyes_interval_minutes: number | null
          id: string
          posture_enabled: boolean | null
          posture_interval_minutes: number | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          show_during_focus: boolean | null
          stretch_enabled: boolean | null
          stretch_interval_minutes: number | null
          updated_at: string | null
          user_id: string
          water_enabled: boolean | null
          water_interval_minutes: number | null
        }
        Insert: {
          created_at?: string | null
          eyes_enabled?: boolean | null
          eyes_interval_minutes?: number | null
          id?: string
          posture_enabled?: boolean | null
          posture_interval_minutes?: number | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          show_during_focus?: boolean | null
          stretch_enabled?: boolean | null
          stretch_interval_minutes?: number | null
          updated_at?: string | null
          user_id: string
          water_enabled?: boolean | null
          water_interval_minutes?: number | null
        }
        Update: {
          created_at?: string | null
          eyes_enabled?: boolean | null
          eyes_interval_minutes?: number | null
          id?: string
          posture_enabled?: boolean | null
          posture_interval_minutes?: number | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          show_during_focus?: boolean | null
          stretch_enabled?: boolean | null
          stretch_interval_minutes?: number | null
          updated_at?: string | null
          user_id?: string
          water_enabled?: boolean | null
          water_interval_minutes?: number | null
        }
        Relationships: []
      }
      mf_wellness_logs: {
        Row: {
          action: string
          id: string
          logged_at: string | null
          reminder_type: string
          user_id: string
        }
        Insert: {
          action: string
          id?: string
          logged_at?: string | null
          reminder_type: string
          user_id: string
        }
        Update: {
          action?: string
          id?: string
          logged_at?: string | null
          reminder_type?: string
          user_id?: string
        }
        Relationships: []
      }
      mma_batch_participants: {
        Row: {
          batch_id: string
          checked_in_at: string | null
          completed_at: string | null
          created_at: string | null
          enrolled_id: string
          id: string
          notes: string | null
          order_number: number
          result_data: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          batch_id: string
          checked_in_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          enrolled_id: string
          id?: string
          notes?: string | null
          order_number: number
          result_data?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          batch_id?: string
          checked_in_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          enrolled_id?: string
          id?: string
          notes?: string | null
          order_number?: number
          result_data?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mma_batch_participants_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "mma_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_batch_participants_enrolled_id_fkey"
            columns: ["enrolled_id"]
            isOneToOne: false
            referencedRelation: "mma_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_batches: {
        Row: {
          batch_number: number
          batch_type: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          end_time: string | null
          event_id: string
          id: string
          location: string | null
          max_capacity: number | null
          name: string | null
          notes: string | null
          room: string | null
          route_from: string | null
          route_to: string | null
          scheduled_date: string
          scheduled_time: string
          start_time: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          batch_number: number
          batch_type?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          event_id: string
          id?: string
          location?: string | null
          max_capacity?: number | null
          name?: string | null
          notes?: string | null
          room?: string | null
          route_from?: string | null
          route_to?: string | null
          scheduled_date: string
          scheduled_time: string
          start_time?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          batch_number?: number
          batch_type?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          event_id?: string
          id?: string
          location?: string | null
          max_capacity?: number | null
          name?: string | null
          notes?: string | null
          room?: string | null
          route_from?: string | null
          route_to?: string | null
          scheduled_date?: string
          scheduled_time?: string
          start_time?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mma_batches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mma_events"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_blood_tests: {
        Row: {
          collection_date: string | null
          created_at: string | null
          enrolled_id: string
          event_id: string
          expiration_date: string | null
          id: string
          lab_name: string | null
          notes: string | null
          result: string | null
          result_date: string | null
          result_file_path: string | null
          result_notes: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: string | null
          test_type: string
          updated_at: string | null
        }
        Insert: {
          collection_date?: string | null
          created_at?: string | null
          enrolled_id: string
          event_id: string
          expiration_date?: string | null
          id?: string
          lab_name?: string | null
          notes?: string | null
          result?: string | null
          result_date?: string | null
          result_file_path?: string | null
          result_notes?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string | null
          test_type: string
          updated_at?: string | null
        }
        Update: {
          collection_date?: string | null
          created_at?: string | null
          enrolled_id?: string
          event_id?: string
          expiration_date?: string | null
          id?: string
          lab_name?: string | null
          notes?: string | null
          result?: string | null
          result_date?: string | null
          result_file_path?: string | null
          result_notes?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string | null
          test_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mma_blood_tests_enrolled_id_fkey"
            columns: ["enrolled_id"]
            isOneToOne: false
            referencedRelation: "mma_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_blood_tests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mma_events"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_car_passengers: {
        Row: {
          car_id: string
          created_at: string | null
          dropoff_location: string | null
          enrolled_id: string
          flight_id: string | null
          id: string
          notes: string | null
          pickup_location: string | null
          pickup_time: string | null
          transport_type: string
        }
        Insert: {
          car_id: string
          created_at?: string | null
          dropoff_location?: string | null
          enrolled_id: string
          flight_id?: string | null
          id?: string
          notes?: string | null
          pickup_location?: string | null
          pickup_time?: string | null
          transport_type: string
        }
        Update: {
          car_id?: string
          created_at?: string | null
          dropoff_location?: string | null
          enrolled_id?: string
          flight_id?: string | null
          id?: string
          notes?: string | null
          pickup_location?: string | null
          pickup_time?: string | null
          transport_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "mma_car_passengers_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "mma_event_cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_car_passengers_enrolled_id_fkey"
            columns: ["enrolled_id"]
            isOneToOne: false
            referencedRelation: "mma_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_car_passengers_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "mma_flights"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_coach_data: {
        Row: {
          created_at: string | null
          height_cm: number | null
          id: string
          person_id: string
          shoe_size: string | null
          uniform_size: string | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string | null
          height_cm?: number | null
          id?: string
          person_id: string
          shoe_size?: string | null
          uniform_size?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string | null
          height_cm?: number | null
          id?: string
          person_id?: string
          shoe_size?: string | null
          uniform_size?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mma_coach_data_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "mma_people"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_drivers: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          license_number: string | null
          notes: string | null
          phone: string | null
          updated_at: string | null
          vehicle_info: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          license_number?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          vehicle_info?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          license_number?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          vehicle_info?: string | null
        }
        Relationships: []
      }
      mma_enrollment_corners: {
        Row: {
          corner_enrollment_id: string
          created_at: string
          created_by: string | null
          fighter_enrollment_id: string
          id: string
        }
        Insert: {
          corner_enrollment_id: string
          created_at?: string
          created_by?: string | null
          fighter_enrollment_id: string
          id?: string
        }
        Update: {
          corner_enrollment_id?: string
          created_at?: string
          created_by?: string | null
          fighter_enrollment_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mma_enrollment_corners_corner_enrollment_id_fkey"
            columns: ["corner_enrollment_id"]
            isOneToOne: false
            referencedRelation: "mma_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_enrollment_corners_fighter_enrollment_id_fkey"
            columns: ["fighter_enrollment_id"]
            isOneToOne: false
            referencedRelation: "mma_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_enrollments: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          corner: string | null
          created_at: string
          created_by: string | null
          event_code: string | null
          event_code_seq: number | null
          event_id: string
          id: string
          needs_flight: string
          needs_hotel: boolean
          needs_transport: string
          needs_visa: boolean
          person_id: string
          role_id: string
          status: string
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          corner?: string | null
          created_at?: string
          created_by?: string | null
          event_code?: string | null
          event_code_seq?: number | null
          event_id: string
          id?: string
          needs_flight?: string
          needs_hotel?: boolean
          needs_transport?: string
          needs_visa?: boolean
          person_id: string
          role_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          corner?: string | null
          created_at?: string
          created_by?: string | null
          event_code?: string | null
          event_code_seq?: number | null
          event_id?: string
          id?: string
          needs_flight?: string
          needs_hotel?: boolean
          needs_transport?: string
          needs_visa?: boolean
          person_id?: string
          role_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mma_enrollments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mma_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_enrollments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "mma_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_enrollments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "mma_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_entrance_music: {
        Row: {
          artist: string | null
          created_at: string | null
          duration_seconds: number | null
          enrolled_id: string
          event_id: string
          file_path: string | null
          id: string
          notes: string | null
          song_title: string | null
          source_type: string | null
          source_url: string | null
          source_url_2: string | null
          source_url_3: string | null
          start_time_2: number | null
          start_time_3: number | null
          start_time_seconds: number | null
          status: string | null
          status_1: string
          title_1: string | null
          title_2: string | null
          title_3: string | null
          status_2: string
          status_3: string
          updated_at: string | null
          walkout_order: number | null
        }
        Insert: {
          artist?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          enrolled_id: string
          event_id: string
          file_path?: string | null
          id?: string
          notes?: string | null
          song_title?: string | null
          source_type?: string | null
          source_url?: string | null
          source_url_2?: string | null
          source_url_3?: string | null
          start_time_2?: number | null
          start_time_3?: number | null
          start_time_seconds?: number | null
          status?: string | null
          status_1?: string
          title_1?: string | null
          title_2?: string | null
          title_3?: string | null
          status_2?: string
          status_3?: string
          updated_at?: string | null
          walkout_order?: number | null
        }
        Update: {
          artist?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          enrolled_id?: string
          event_id?: string
          file_path?: string | null
          id?: string
          notes?: string | null
          song_title?: string | null
          source_type?: string | null
          source_url?: string | null
          source_url_2?: string | null
          source_url_3?: string | null
          start_time_2?: number | null
          start_time_3?: number | null
          start_time_seconds?: number | null
          status?: string | null
          status_1?: string
          title_1?: string | null
          title_2?: string | null
          title_3?: string | null
          status_2?: string
          status_3?: string
          updated_at?: string | null
          walkout_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mma_entrance_music_enrolled_id_fkey"
            columns: ["enrolled_id"]
            isOneToOne: false
            referencedRelation: "mma_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_entrance_music_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mma_events"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_entrance_music_log: {
        Row: {
          changed_at: string
          enrolled_id: string
          event_id: string
          field: string
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          changed_at?: string
          enrolled_id: string
          event_id: string
          field: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          changed_at?: string
          enrolled_id?: string
          event_id?: string
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: []
      }
      mma_event_cars: {
        Row: {
          capacity: number
          car_label: string | null
          car_number: number
          created_at: string | null
          driver_id: string | null
          event_id: string
          id: string
          license_plate: string | null
          notes: string | null
          dropoff_location: string | null
          pickup_location: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          transport_type: string | null
          updated_at: string | null
          vehicle_type: string | null
        }
        Insert: {
          capacity?: number
          car_label?: string | null
          car_number: number
          created_at?: string | null
          driver_id?: string | null
          event_id: string
          id?: string
          license_plate?: string | null
          notes?: string | null
          dropoff_location?: string | null
          pickup_location?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          transport_type?: string | null
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Update: {
          capacity?: number
          car_label?: string | null
          car_number?: number
          created_at?: string | null
          driver_id?: string | null
          event_id?: string
          id?: string
          license_plate?: string | null
          notes?: string | null
          dropoff_location?: string | null
          pickup_location?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          transport_type?: string | null
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mma_event_cars_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "mma_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_event_checklist_items: {
        Row: {
          created_at: string
          display_order: number
          event_id: string
          id: string
          is_active: boolean
          item_name: string
          item_type: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          event_id: string
          id?: string
          is_active?: boolean
          item_name: string
          item_type?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          event_id?: string
          id?: string
          is_active?: boolean
          item_name?: string
          item_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "mma_event_checklist_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mma_events"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_event_tasks: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          category: string
          checklist_items: Json | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          event_id: string
          id: string
          name: string
          notes: string | null
          priority: string | null
          start_date: string | null
          started_at: string | null
          status: string | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          category: string
          checklist_items?: Json | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          event_id: string
          id?: string
          name: string
          notes?: string | null
          priority?: string | null
          start_date?: string | null
          started_at?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          category?: string
          checklist_items?: Json | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          event_id?: string
          id?: string
          name?: string
          notes?: string | null
          priority?: string | null
          start_date?: string | null
          started_at?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mma_event_tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "mma_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_event_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "mma_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_event_tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mma_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_event_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "mma_task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_event_weigh_ins: {
        Row: {
          created_at: string | null
          enrolled_id: string
          event_id: string
          id: string
          made_weight: boolean | null
          notes: string | null
          official_weight_kg: number | null
          updated_at: string | null
          weigh_in_time: string | null
          weight_miss_kg: number | null
        }
        Insert: {
          created_at?: string | null
          enrolled_id: string
          event_id: string
          id?: string
          made_weight?: boolean | null
          notes?: string | null
          official_weight_kg?: number | null
          updated_at?: string | null
          weigh_in_time?: string | null
          weight_miss_kg?: number | null
        }
        Update: {
          created_at?: string | null
          enrolled_id?: string
          event_id?: string
          id?: string
          made_weight?: boolean | null
          notes?: string | null
          official_weight_kg?: number | null
          updated_at?: string | null
          weigh_in_time?: string | null
          weight_miss_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mma_event_weigh_ins_enrolled_id_fkey"
            columns: ["enrolled_id"]
            isOneToOne: false
            referencedRelation: "mma_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_event_weigh_ins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mma_events"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_events: {
        Row: {
          checkin_margin_hours: number
          checkout_margin_hours: number
          city: string | null
          code: string | null
          country: string | null
          created_at: string
          created_by: string | null
          event_date: string
          event_end_date: string | null
          fight_card_csv_url: string | null
          id: string
          main_airport: string | null
          name: string
          notes: string | null
          status: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          checkin_margin_hours?: number
          checkout_margin_hours?: number
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          event_date: string
          event_end_date?: string | null
          fight_card_csv_url?: string | null
          id?: string
          main_airport?: string | null
          name: string
          notes?: string | null
          status?: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          checkin_margin_hours?: number
          checkout_margin_hours?: number
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          event_date?: string
          event_end_date?: string | null
          fight_card_csv_url?: string | null
          id?: string
          main_airport?: string | null
          name?: string
          notes?: string | null
          status?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      mma_fighter_stats: {
        Row: {
          coach1_size: string | null
          coach2_size: string | null
          coach3_size: string | null
          corner: string | null
          collected_at: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          collected_by: string | null
          created_at: string | null
          draws: number | null
          fighting_style: string | null
          gloves_size: string | null
          height_cm: number | null
          id: string
          jacket_size: string | null
          losses: number | null
          losses_decision: number | null
          losses_ko: number | null
          losses_submission: number | null
          nickname: string | null
          no_contests: number | null
          person_id: string
          reach_cm: number | null
          residency: string | null
          shoe_size: string | null
          shorts_size: string | null
          team_gym: string | null
          tshirt_size: string | null
          uniform_size: string | null
          updated_at: string | null
          weight_class: string | null
          weight_kg: number | null
          wins: number | null
          wins_decision: number | null
          wins_ko: number | null
          wins_submission: number | null
        }
        Insert: {
          coach1_size?: string | null
          coach2_size?: string | null
          coach3_size?: string | null
          corner?: string | null
          collected_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          collected_by?: string | null
          created_at?: string | null
          draws?: number | null
          fighting_style?: string | null
          gloves_size?: string | null
          height_cm?: number | null
          id?: string
          jacket_size?: string | null
          losses?: number | null
          losses_decision?: number | null
          losses_ko?: number | null
          losses_submission?: number | null
          nickname?: string | null
          no_contests?: number | null
          person_id: string
          reach_cm?: number | null
          residency?: string | null
          shoe_size?: string | null
          shorts_size?: string | null
          team_gym?: string | null
          tshirt_size?: string | null
          uniform_size?: string | null
          updated_at?: string | null
          weight_class?: string | null
          weight_kg?: number | null
          wins?: number | null
          wins_decision?: number | null
          wins_ko?: number | null
          wins_submission?: number | null
        }
        Update: {
          coach1_size?: string | null
          coach2_size?: string | null
          coach3_size?: string | null
          corner?: string | null
          collected_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          collected_by?: string | null
          created_at?: string | null
          draws?: number | null
          fighting_style?: string | null
          gloves_size?: string | null
          height_cm?: number | null
          id?: string
          jacket_size?: string | null
          losses?: number | null
          losses_decision?: number | null
          losses_ko?: number | null
          losses_submission?: number | null
          nickname?: string | null
          no_contests?: number | null
          person_id?: string
          reach_cm?: number | null
          residency?: string | null
          shoe_size?: string | null
          shorts_size?: string | null
          team_gym?: string | null
          tshirt_size?: string | null
          uniform_size?: string | null
          updated_at?: string | null
          weight_class?: string | null
          weight_kg?: number | null
          wins?: number | null
          wins_decision?: number | null
          wins_ko?: number | null
          wins_submission?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mma_fighter_stats_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "mma_people"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_flights: {
        Row: {
          arrival_airport: string | null
          arrival_date: string | null
          arrival_flight_number: string | null
          arrival_reservation: string | null
          arrival_ticket_link: string | null
          arrival_time: string | null
          created_at: string
          created_by: string | null
          departure_airport: string | null
          departure_date: string | null
          departure_flight_number: string | null
          departure_reservation: string | null
          departure_ticket_link: string | null
          departure_time: string | null
          enrollment_id: string
          id: string
          notes: string | null
          status: string
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          arrival_airport?: string | null
          arrival_date?: string | null
          arrival_flight_number?: string | null
          arrival_reservation?: string | null
          arrival_ticket_link?: string | null
          arrival_time?: string | null
          created_at?: string
          created_by?: string | null
          departure_airport?: string | null
          departure_date?: string | null
          departure_flight_number?: string | null
          departure_reservation?: string | null
          departure_ticket_link?: string | null
          departure_time?: string | null
          enrollment_id: string
          id?: string
          notes?: string | null
          status?: string
          type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          arrival_airport?: string | null
          arrival_date?: string | null
          arrival_flight_number?: string | null
          arrival_reservation?: string | null
          arrival_ticket_link?: string | null
          arrival_time?: string | null
          created_at?: string
          created_by?: string | null
          departure_airport?: string | null
          departure_date?: string | null
          departure_flight_number?: string | null
          departure_reservation?: string | null
          departure_ticket_link?: string | null
          departure_time?: string | null
          enrollment_id?: string
          id?: string
          notes?: string | null
          status?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mma_flights_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "mma_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_hotels: {
        Row: {
          actual_checkin: string | null
          actual_checkout: string | null
          approved_at: string | null
          approved_by: string | null
          calculated_checkin: string | null
          calculated_checkout: string | null
          checked_in_at: string | null
          checkin_date: string | null
          checkin_time: string | null
          checkout_date: string | null
          checkout_time: string | null
          confirmation_number: string | null
          created_at: string
          created_by: string | null
          divergence_approved: boolean | null
          divergence_approved_at: string | null
          divergence_approved_by: string | null
          divergence_reason: string | null
          divergence_type: string[] | null
          enrollment_id: string
          event_id: string | null
          has_divergence: boolean
          hotel_name: string | null
          id: string
          notes: string | null
          primary_divergence_type: string | null
          reservation_number: string | null
          extra_bed: boolean
          room_number: string | null
          room_type: string | null
          status: string
          suggested_checkin_date: string | null
          suggested_checkin_time: string | null
          suggested_checkout_date: string | null
          suggested_checkout_time: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actual_checkin?: string | null
          actual_checkout?: string | null
          approved_at?: string | null
          approved_by?: string | null
          calculated_checkin?: string | null
          calculated_checkout?: string | null
          checked_in_at?: string | null
          checkin_date?: string | null
          checkin_time?: string | null
          checkout_date?: string | null
          checkout_time?: string | null
          confirmation_number?: string | null
          created_at?: string
          created_by?: string | null
          divergence_approved?: boolean | null
          divergence_approved_at?: string | null
          divergence_approved_by?: string | null
          divergence_reason?: string | null
          divergence_type?: string[] | null
          enrollment_id: string
          event_id?: string | null
          has_divergence?: boolean
          hotel_name?: string | null
          id?: string
          notes?: string | null
          primary_divergence_type?: string | null
          reservation_number?: string | null
          extra_bed?: boolean
          room_number?: string | null
          room_type?: string | null
          status?: string
          suggested_checkin_date?: string | null
          suggested_checkin_time?: string | null
          suggested_checkout_date?: string | null
          suggested_checkout_time?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actual_checkin?: string | null
          actual_checkout?: string | null
          approved_at?: string | null
          approved_by?: string | null
          calculated_checkin?: string | null
          calculated_checkout?: string | null
          checked_in_at?: string | null
          checkin_date?: string | null
          checkin_time?: string | null
          checkout_date?: string | null
          checkout_time?: string | null
          confirmation_number?: string | null
          created_at?: string
          created_by?: string | null
          divergence_approved?: boolean | null
          divergence_approved_at?: string | null
          divergence_approved_by?: string | null
          divergence_reason?: string | null
          divergence_type?: string[] | null
          enrollment_id?: string
          event_id?: string | null
          has_divergence?: boolean
          hotel_name?: string | null
          id?: string
          notes?: string | null
          primary_divergence_type?: string | null
          reservation_number?: string | null
          extra_bed?: boolean
          room_number?: string | null
          room_type?: string | null
          status?: string
          suggested_checkin_date?: string | null
          suggested_checkin_time?: string | null
          suggested_checkout_date?: string | null
          suggested_checkout_time?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mma_hotels_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "mma_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_hotels_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "mma_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_hotels_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mma_events"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_matches: {
        Row: {
          blue_corner_enrollment_id: string | null
          created_at: string | null
          division: string | null
          event_id: string
          id: string
          match_number: number
          notes: string | null
          red_corner_enrollment_id: string | null
          result_method: string | null
          result_round: number | null
          result_time: string | null
          status: string | null
          updated_at: string | null
          winner_enrollment_id: string | null
        }
        Insert: {
          blue_corner_enrollment_id?: string | null
          created_at?: string | null
          division?: string | null
          event_id: string
          id?: string
          match_number: number
          notes?: string | null
          red_corner_enrollment_id?: string | null
          result_method?: string | null
          result_round?: number | null
          result_time?: string | null
          status?: string | null
          updated_at?: string | null
          winner_enrollment_id?: string | null
        }
        Update: {
          blue_corner_enrollment_id?: string | null
          created_at?: string | null
          division?: string | null
          event_id?: string
          id?: string
          match_number?: number
          notes?: string | null
          red_corner_enrollment_id?: string | null
          result_method?: string | null
          result_round?: number | null
          result_time?: string | null
          status?: string | null
          updated_at?: string | null
          winner_enrollment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mma_matches_blue_corner_enrollment_id_fkey"
            columns: ["blue_corner_enrollment_id"]
            isOneToOne: false
            referencedRelation: "mma_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_matches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mma_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_matches_red_corner_enrollment_id_fkey"
            columns: ["red_corner_enrollment_id"]
            isOneToOne: false
            referencedRelation: "mma_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_matches_winner_enrollment_id_fkey"
            columns: ["winner_enrollment_id"]
            isOneToOne: false
            referencedRelation: "mma_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_medical_clearance: {
        Row: {
          created_at: string
          enrolled_id: string
          event_id: string
          id: string
          notes: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          enrolled_id: string
          event_id: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          enrolled_id?: string
          event_id?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mma_medical_clearance_enrolled_id_fkey"
            columns: ["enrolled_id"]
            isOneToOne: false
            referencedRelation: "mma_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_medical_clearance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mma_events"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_medical_clearance_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          clearance_id: string
          enrolled_id: string
          field: string
          new_value: string | null
          old_value: string | null
          event_id: string
          id: string
          new_status: string
          old_status: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          clearance_id: string
          enrolled_id: string
          field?: string
          new_value?: string | null
          old_value?: string | null
          event_id: string
          id?: string
          new_status: string
          old_status?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          clearance_id?: string
          enrolled_id?: string
          field?: string
          new_value?: string | null
          old_value?: string | null
          event_id?: string
          id?: string
          new_status?: string
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mma_medical_clearance_log_clearance_id_fkey"
            columns: ["clearance_id"]
            isOneToOne: false
            referencedRelation: "mma_medical_clearance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_medical_clearance_log_enrolled_id_fkey"
            columns: ["enrolled_id"]
            isOneToOne: false
            referencedRelation: "mma_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_medical_clearance_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mma_events"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_medical_exams: {
        Row: {
          completed_date: string | null
          created_at: string | null
          enrolled_id: string
          event_id: string
          exam_type: string
          examiner_name: string | null
          expiration_date: string | null
          facility_name: string | null
          findings: string | null
          id: string
          notes: string | null
          passed: boolean | null
          recommendations: string | null
          report_file_path: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          completed_date?: string | null
          created_at?: string | null
          enrolled_id: string
          event_id: string
          exam_type: string
          examiner_name?: string | null
          expiration_date?: string | null
          facility_name?: string | null
          findings?: string | null
          id?: string
          notes?: string | null
          passed?: boolean | null
          recommendations?: string | null
          report_file_path?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_date?: string | null
          created_at?: string | null
          enrolled_id?: string
          event_id?: string
          exam_type?: string
          examiner_name?: string | null
          expiration_date?: string | null
          facility_name?: string | null
          findings?: string | null
          id?: string
          notes?: string | null
          passed?: boolean | null
          recommendations?: string | null
          report_file_path?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mma_medical_exams_enrolled_id_fkey"
            columns: ["enrolled_id"]
            isOneToOne: false
            referencedRelation: "mma_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_medical_exams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mma_events"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_message_attachments: {
        Row: {
          created_at: string
          file_link: string
          file_name: string
          file_type: string | null
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          file_link: string
          file_name: string
          file_type?: string | null
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string
          file_link?: string
          file_name?: string
          file_type?: string | null
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mma_message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "mma_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_message_reads: {
        Row: {
          enrollment_id: string
          id: string
          message_id: string
          read_at: string
        }
        Insert: {
          enrollment_id: string
          id?: string
          message_id: string
          read_at?: string
        }
        Update: {
          enrollment_id?: string
          id?: string
          message_id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mma_message_reads_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "mma_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "mma_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_messages: {
        Row: {
          body: string
          created_by: string | null
          event_id: string
          id: string
          sent_at: string
          target_batch_id: string | null
          target_enrollment_id: string | null
          target_role_id: string | null
          target_type: string
          title: string | null
        }
        Insert: {
          body: string
          created_by?: string | null
          event_id: string
          id?: string
          sent_at?: string
          target_batch_id?: string | null
          target_enrollment_id?: string | null
          target_role_id?: string | null
          target_type: string
          title?: string | null
        }
        Update: {
          body?: string
          created_by?: string | null
          event_id?: string
          id?: string
          sent_at?: string
          target_batch_id?: string | null
          target_enrollment_id?: string | null
          target_role_id?: string | null
          target_type?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mma_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mma_events"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_people: {
        Row: {
          appadmin_fighter_id: string | null
          compiled_name: string | null
          created_at: string
          created_by: string | null
          dob: string | null
          document_folder: string | null
          event_name: string | null
          gender: string | null
          height: number | null
          id: string
          name: string
          nationality: string | null
          passport_expiry: string | null
          passport_number: string | null
          passport_photo: string | null
          phone: string | null
          reach: number | null
          surname: string | null
          updated_at: string
        }
        Insert: {
          appadmin_fighter_id?: string | null
          compiled_name?: string | null
          created_at?: string
          created_by?: string | null
          dob?: string | null
          document_folder?: string | null
          event_name?: string | null
          gender?: string | null
          height?: number | null
          id?: string
          name: string
          nationality?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          passport_photo?: string | null
          phone?: string | null
          reach?: number | null
          surname?: string | null
          updated_at?: string
        }
        Update: {
          appadmin_fighter_id?: string | null
          compiled_name?: string | null
          created_at?: string
          created_by?: string | null
          dob?: string | null
          document_folder?: string | null
          event_name?: string | null
          gender?: string | null
          height?: number | null
          id?: string
          name?: string
          nationality?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          passport_photo?: string | null
          phone?: string | null
          reach?: number | null
          surname?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mma_people_documents: {
        Row: {
          created_at: string
          created_by: string | null
          document_link: string
          document_name: string
          document_type: string
          expiry_date: string | null
          id: string
          notes: string | null
          person_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_link: string
          document_name: string
          document_type: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          person_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_link?: string
          document_name?: string
          document_type?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mma_people_documents_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "mma_people"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_permission_areas: {
        Row: {
          code: string
          display_order: number
          id: string
          name: string
        }
        Insert: {
          code: string
          display_order?: number
          id?: string
          name: string
        }
        Update: {
          code?: string
          display_order?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      mma_pre_event_clearance: {
        Row: {
          blood_tests_cleared: boolean | null
          cleared_by: string | null
          cleared_date: string | null
          created_at: string | null
          denial_reason: string | null
          documents_cleared: boolean | null
          enrolled_id: string
          event_id: string
          id: string
          medical_exams_cleared: boolean | null
          notes: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          blood_tests_cleared?: boolean | null
          cleared_by?: string | null
          cleared_date?: string | null
          created_at?: string | null
          denial_reason?: string | null
          documents_cleared?: boolean | null
          enrolled_id: string
          event_id: string
          id?: string
          medical_exams_cleared?: boolean | null
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          blood_tests_cleared?: boolean | null
          cleared_by?: string | null
          cleared_date?: string | null
          created_at?: string | null
          denial_reason?: string | null
          documents_cleared?: boolean | null
          enrolled_id?: string
          event_id?: string
          id?: string
          medical_exams_cleared?: boolean | null
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mma_pre_event_clearance_cleared_by_fkey"
            columns: ["cleared_by"]
            isOneToOne: false
            referencedRelation: "mma_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_pre_event_clearance_enrolled_id_fkey"
            columns: ["enrolled_id"]
            isOneToOne: false
            referencedRelation: "mma_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_pre_event_clearance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mma_events"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_required_documents: {
        Row: {
          created_at: string | null
          document_name: string
          document_type: string
          enrolled_id: string
          event_id: string
          expiration_date: string | null
          file_path: string | null
          id: string
          notes: string | null
          rejection_reason: string | null
          reviewed_by: string | null
          reviewed_date: string | null
          status: string | null
          submitted_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_name: string
          document_type: string
          enrolled_id: string
          event_id: string
          expiration_date?: string | null
          file_path?: string | null
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          reviewed_by?: string | null
          reviewed_date?: string | null
          status?: string | null
          submitted_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_name?: string
          document_type?: string
          enrolled_id?: string
          event_id?: string
          expiration_date?: string | null
          file_path?: string | null
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          reviewed_by?: string | null
          reviewed_date?: string | null
          status?: string | null
          submitted_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mma_required_documents_enrolled_id_fkey"
            columns: ["enrolled_id"]
            isOneToOne: false
            referencedRelation: "mma_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_required_documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mma_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_required_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "mma_users"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_roles: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_base: boolean
          name: string
          parent_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_base?: boolean
          name: string
          parent_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_base?: boolean
          name?: string
          parent_id?: string | null
        }
        Relationships: []
      }
      mma_staging_checkins: {
        Row: {
          bus_number: string | null
          bus_time: string | null
          call_order: number | null
          coaches_credentials_given: number | null
          coaches_with_bus_count: number | null
          created_at: string | null
          cup_status: string | null
          enrolled_id: string
          event_id: string
          id: string
          is_completed: boolean | null
          mouthguard_status: string | null
          nails_status: string | null
          notes: string | null
          passport_status: string | null
          uniform_status: string | null
          updated_at: string | null
        }
        Insert: {
          bus_number?: string | null
          bus_time?: string | null
          call_order?: number | null
          coaches_credentials_given?: number | null
          coaches_with_bus_count?: number | null
          created_at?: string | null
          cup_status?: string | null
          enrolled_id: string
          event_id: string
          id?: string
          is_completed?: boolean | null
          mouthguard_status?: string | null
          nails_status?: string | null
          notes?: string | null
          passport_status?: string | null
          uniform_status?: string | null
          updated_at?: string | null
        }
        Update: {
          bus_number?: string | null
          bus_time?: string | null
          call_order?: number | null
          coaches_credentials_given?: number | null
          coaches_with_bus_count?: number | null
          created_at?: string | null
          cup_status?: string | null
          enrolled_id?: string
          event_id?: string
          id?: string
          is_completed?: boolean | null
          mouthguard_status?: string | null
          nails_status?: string | null
          notes?: string | null
          passport_status?: string | null
          uniform_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mma_staging_checkins_enrolled_id_fkey"
            columns: ["enrolled_id"]
            isOneToOne: false
            referencedRelation: "mma_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_staging_checkins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "mma_events"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_task_assignments: {
        Row: {
          completed_at: string | null
          created_at: string | null
          enrollment_id: string
          id: string
          notes: string | null
          status: string
          task_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          enrollment_id: string
          id?: string
          notes?: string | null
          status?: string
          task_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          enrollment_id?: string
          id?: string
          notes?: string | null
          status?: string
          task_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mma_task_assignments_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "mma_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "mma_event_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_task_templates: {
        Row: {
          category: string | null
          checklist_items: Json | null
          created_at: string | null
          default_priority: string | null
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          checklist_items?: Json | null
          created_at?: string | null
          default_priority?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          checklist_items?: Json | null
          created_at?: string | null
          default_priority?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mma_user_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          token: string
          user_type: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          token: string
          user_type?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          token?: string
          user_type?: string
        }
        Relationships: []
      }
      mma_user_permissions: {
        Row: {
          area_id: string
          created_at: string
          created_by: string | null
          id: string
          permission: string
          user_id: string
        }
        Insert: {
          area_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          permission: string
          user_id: string
        }
        Update: {
          area_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          permission?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mma_user_permissions_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "mma_permission_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mma_user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mma_users"
            referencedColumns: ["id"]
          },
        ]
      }
      mma_users: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          name: string
          updated_at: string
          user_type: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string | null
          id: string
          is_active?: boolean
          last_login_at?: string | null
          name?: string
          updated_at?: string
          user_type?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          name?: string
          updated_at?: string
          user_type?: string
        }
        Relationships: []
      }
      mma_visas: {
        Row: {
          created_at: string
          created_by: string | null
          departure_airport: string | null
          document_link: string | null
          enrollment_id: string
          id: string
          is_done: boolean
          nationality: string | null
          notes: string | null
          passport_name: string | null
          status: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          departure_airport?: string | null
          document_link?: string | null
          enrollment_id: string
          id?: string
          is_done?: boolean
          nationality?: string | null
          notes?: string | null
          passport_name?: string | null
          status?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          departure_airport?: string | null
          document_link?: string | null
          enrollment_id?: string
          id?: string
          is_done?: boolean
          nationality?: string | null
          notes?: string | null
          passport_name?: string | null
          status?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mma_visas_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "mma_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_logs: {
        Row: {
          app_id: string
          created_at: string | null
          id: number
          mood: string
          notes: string | null
          user_id: string | null
        }
        Insert: {
          app_id: string
          created_at?: string | null
          id?: number
          mood: string
          notes?: string | null
          user_id?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string | null
          id?: number
          mood?: string
          notes?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mood_logs_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          app_id: string
          content: string | null
          created_at: string | null
          embedding: string | null
          hashtags: string[] | null
          id: string
          is_archived: boolean | null
          project_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app_id?: string
          content?: string | null
          created_at?: string | null
          embedding?: string | null
          hashtags?: string[] | null
          id?: string
          is_archived?: boolean | null
          project_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          app_id?: string
          content?: string | null
          created_at?: string | null
          embedding?: string | null
          hashtags?: string[] | null
          id?: string
          is_archived?: boolean | null
          project_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          created_at: string | null
          date_of_birth: string | null
          drive_folder_url: string | null
          email: string | null
          event_name: string | null
          first_name: string
          gender: string | null
          id: string
          last_name: string
          nationality: string | null
          passport_copy_url: string | null
          passport_expiry: string | null
          passport_number: string | null
          phone: string | null
          uaew_app_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_of_birth?: string | null
          drive_folder_url?: string | null
          email?: string | null
          event_name?: string | null
          first_name: string
          gender?: string | null
          id?: string
          last_name: string
          nationality?: string | null
          passport_copy_url?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          uaew_app_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string | null
          drive_folder_url?: string | null
          email?: string | null
          event_name?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          nationality?: string | null
          passport_copy_url?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          uaew_app_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      personnel: {
        Row: {
          app_id: string
          compiled_name: string | null
          copy_url: string | null
          created_at: string | null
          dob: string | null
          expiry_date: string | null
          fighter_id: number | null
          folder_url: string | null
          gender: string | null
          id: string
          index: number | null
          last_edition: string | null
          name: string | null
          nationality: string | null
          nickname: string | null
          passport: string | null
          phone: string | null
          photo_url: string | null
          ps_number: string | null
          surname: string | null
          uaew_app_id: string | null
          updated_at: string | null
          user_id: string | null
          validation_status: string | null
        }
        Insert: {
          app_id?: string
          compiled_name?: string | null
          copy_url?: string | null
          created_at?: string | null
          dob?: string | null
          expiry_date?: string | null
          fighter_id?: number | null
          folder_url?: string | null
          gender?: string | null
          id?: string
          index?: number | null
          last_edition?: string | null
          name?: string | null
          nationality?: string | null
          nickname?: string | null
          passport?: string | null
          phone?: string | null
          photo_url?: string | null
          ps_number?: string | null
          surname?: string | null
          uaew_app_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          validation_status?: string | null
        }
        Update: {
          app_id?: string
          compiled_name?: string | null
          copy_url?: string | null
          created_at?: string | null
          dob?: string | null
          expiry_date?: string | null
          fighter_id?: number | null
          folder_url?: string | null
          gender?: string | null
          id?: string
          index?: number | null
          last_edition?: string | null
          name?: string | null
          nationality?: string | null
          nickname?: string | null
          passport?: string | null
          phone?: string | null
          photo_url?: string | null
          ps_number?: string | null
          surname?: string | null
          uaew_app_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personnel_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          app_id: string
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          smart_achievable: string | null
          smart_measurable: string | null
          smart_relevant: string | null
          smart_specific: string | null
          smart_time_bound: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          woop_obstacle: string | null
          woop_outcome: string | null
          woop_plan: string | null
          woop_wish: string | null
        }
        Insert: {
          app_id: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          smart_achievable?: string | null
          smart_measurable?: string | null
          smart_relevant?: string | null
          smart_specific?: string | null
          smart_time_bound?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          woop_obstacle?: string | null
          woop_outcome?: string | null
          woop_plan?: string | null
          woop_wish?: string | null
        }
        Update: {
          app_id?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          smart_achievable?: string | null
          smart_measurable?: string | null
          smart_relevant?: string | null
          smart_specific?: string | null
          smart_time_bound?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          woop_obstacle?: string | null
          woop_outcome?: string | null
          woop_plan?: string | null
          woop_wish?: string | null
        }
        Relationships: []
      }
      pulse_connections: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          receiver_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          receiver_id: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          receiver_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_connections_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "pulse_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "pulse_users"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_diary_entries: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          entry_date: string
          id: string
          mood: number | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          entry_date?: string
          id?: string
          mood?: number | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          entry_date?: string
          id?: string
          mood?: number | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_diary_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "pulse_users"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_habit_logs: {
        Row: {
          completed: boolean
          created_at: string
          habit_id: string
          id: string
          log_date: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          habit_id: string
          id?: string
          log_date?: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          habit_id?: string
          id?: string
          log_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "pulse_habits"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_habits: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          frequency: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          frequency?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          frequency?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_habits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "pulse_users"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_mood_logs: {
        Row: {
          created_at: string
          has_suicidal_thoughts: boolean | null
          id: string
          is_anxious: number | null
          is_hopeless: number | null
          is_irritable: number | null
          is_sad: number | null
          log_date: string
          mood_score: number
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          has_suicidal_thoughts?: boolean | null
          id?: string
          is_anxious?: number | null
          is_hopeless?: number | null
          is_irritable?: number | null
          is_sad?: number | null
          log_date?: string
          mood_score: number
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          has_suicidal_thoughts?: boolean | null
          id?: string
          is_anxious?: number | null
          is_hopeless?: number | null
          is_irritable?: number | null
          is_sad?: number | null
          log_date?: string
          mood_score?: number
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pulse_session_shares: {
        Row: {
          created_at: string
          date_from: string | null
          date_to: string | null
          id: string
          patient_id: string
          session_id: string
          share_diary: boolean
          share_habits: boolean
          share_tasks: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          id?: string
          patient_id: string
          session_id: string
          share_diary?: boolean
          share_habits?: boolean
          share_tasks?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          id?: string
          patient_id?: string
          session_id?: string
          share_diary?: boolean
          share_habits?: boolean
          share_tasks?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_session_shares_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "pulse_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_session_shares_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pulse_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_session_summaries: {
        Row: {
          created_at: string
          deleted_at: string | null
          goals: string | null
          id: string
          next_session_notes: string | null
          psychologist_id: string
          session_id: string
          structured_summary: string | null
          summary: string | null
          tasks_assigned: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          goals?: string | null
          id?: string
          next_session_notes?: string | null
          psychologist_id: string
          session_id: string
          structured_summary?: string | null
          summary?: string | null
          tasks_assigned?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          goals?: string | null
          id?: string
          next_session_notes?: string | null
          psychologist_id?: string
          session_id?: string
          structured_summary?: string | null
          summary?: string | null
          tasks_assigned?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_session_summaries_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "pulse_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_session_summaries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "pulse_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_sessions: {
        Row: {
          archived_at_patient: string | null
          archived_at_psychologist: string | null
          connection_id: string
          created_at: string
          deleted_at: string | null
          id: string
          notes: string | null
          patient_id: string
          psychologist_id: string
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          archived_at_patient?: string | null
          archived_at_psychologist?: string | null
          connection_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          psychologist_id: string
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          archived_at_patient?: string | null
          archived_at_psychologist?: string | null
          connection_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          psychologist_id?: string
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_sessions_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "pulse_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "pulse_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_sessions_psychologist_id_fkey"
            columns: ["psychologist_id"]
            isOneToOne: false
            referencedRelation: "pulse_users"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_tasks: {
        Row: {
          completed: boolean
          created_at: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          session_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          session_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          session_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_tasks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pulse_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulse_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "pulse_users"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_users: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email: string
          id: string
          name: string
          role: string
          unique_code: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          id: string
          name: string
          role?: string
          unique_code: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: string
          unique_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      quantifiable_habit_entries: {
        Row: {
          created_at: string | null
          entry_date: string
          habit_id: string
          id: number
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string | null
          entry_date: string
          habit_id: string
          id?: number
          user_id: string
          value: number
        }
        Update: {
          created_at?: string | null
          entry_date?: string
          habit_id?: string
          id?: number
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "quantifiable_habit_entries_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          app_id: string
          author: string | null
          created_at: string | null
          id: string
          text: string
          user_id: string | null
        }
        Insert: {
          app_id: string
          author?: string | null
          created_at?: string | null
          id?: string
          text: string
          user_id?: string | null
        }
        Update: {
          app_id?: string
          author?: string | null
          created_at?: string | null
          id?: string
          text?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_event_logs: {
        Row: {
          app_id: string
          error_message: string | null
          event_id: string
          id: string
          imported_at: string | null
          processed: boolean | null
          raw_notes: string | null
          raw_personnel_identifier: string | null
          raw_status: string | null
          raw_task_name: string | null
          raw_timestamp: string | null
          raw_user_name: string | null
          user_id: string
        }
        Insert: {
          app_id?: string
          error_message?: string | null
          event_id: string
          id?: string
          imported_at?: string | null
          processed?: boolean | null
          raw_notes?: string | null
          raw_personnel_identifier?: string | null
          raw_status?: string | null
          raw_task_name?: string | null
          raw_timestamp?: string | null
          raw_user_name?: string | null
          user_id: string
        }
        Update: {
          app_id?: string
          error_message?: string | null
          event_id?: string
          id?: string
          imported_at?: string | null
          processed?: boolean | null
          raw_notes?: string | null
          raw_personnel_identifier?: string | null
          raw_status?: string | null
          raw_task_name?: string | null
          raw_timestamp?: string | null
          raw_user_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_event_logs_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_tasks: {
        Row: {
          app_id: string
          created_at: string | null
          description: string | null
          hashtags: string[] | null
          id: string
          last_created_at: string | null
          priority: string | null
          project: string | null
          recurrence_type: string
          recurrence_value: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          app_id?: string
          created_at?: string | null
          description?: string | null
          hashtags?: string[] | null
          id?: string
          last_created_at?: string | null
          priority?: string | null
          project?: string | null
          recurrence_type: string
          recurrence_value?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string | null
          description?: string | null
          hashtags?: string[] | null
          id?: string
          last_created_at?: string | null
          priority?: string | null
          project?: string | null
          recurrence_type?: string
          recurrence_value?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_tasks_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_blocks: {
        Row: {
          app_id: string
          created_at: string | null
          duration_minutes: number
          end_time: string
          id: string
          start_time: string
          task_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          app_id?: string
          created_at?: string | null
          duration_minutes: number
          end_time: string
          id?: string
          start_time: string
          task_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string | null
          duration_minutes?: number
          end_time?: string
          id?: string
          start_time?: string
          task_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_blocks_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      sjjp_apps: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      sjjp_athletes: {
        Row: {
          age: number
          age_division: string
          app_id: string
          attendance_status: string
          belt: string
          check_in_status: string
          club: string
          consent_accepted: boolean
          consent_date: string
          consent_version: string
          created_at: string | null
          date_of_birth: string
          email: string
          emirates_id: string | null
          emirates_id_back_url: string | null
          emirates_id_front_url: string | null
          event_id: string
          first_name: string
          gender: string
          id: string
          last_name: string
          move_reason: string | null
          moved_to_division_id: string | null
          nationality: string
          payment_proof_url: string | null
          phone: string
          photo_url: string | null
          registered_weight: number | null
          registration_qr_code_id: string | null
          registration_status: string
          school_id: string | null
          seed: number | null
          signature_url: string | null
          updated_at: string | null
          user_id: string | null
          weight: number
          weight_attempts: Json | null
          weight_division: string
        }
        Insert: {
          age: number
          age_division: string
          app_id: string
          attendance_status: string
          belt: string
          check_in_status: string
          club: string
          consent_accepted: boolean
          consent_date: string
          consent_version: string
          created_at?: string | null
          date_of_birth: string
          email: string
          emirates_id?: string | null
          emirates_id_back_url?: string | null
          emirates_id_front_url?: string | null
          event_id: string
          first_name: string
          gender: string
          id?: string
          last_name: string
          move_reason?: string | null
          moved_to_division_id?: string | null
          nationality: string
          payment_proof_url?: string | null
          phone: string
          photo_url?: string | null
          registered_weight?: number | null
          registration_qr_code_id?: string | null
          registration_status: string
          school_id?: string | null
          seed?: number | null
          signature_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          weight: number
          weight_attempts?: Json | null
          weight_division: string
        }
        Update: {
          age?: number
          age_division?: string
          app_id?: string
          attendance_status?: string
          belt?: string
          check_in_status?: string
          club?: string
          consent_accepted?: boolean
          consent_date?: string
          consent_version?: string
          created_at?: string | null
          date_of_birth?: string
          email?: string
          emirates_id?: string | null
          emirates_id_back_url?: string | null
          emirates_id_front_url?: string | null
          event_id?: string
          first_name?: string
          gender?: string
          id?: string
          last_name?: string
          move_reason?: string | null
          moved_to_division_id?: string | null
          nationality?: string
          payment_proof_url?: string | null
          phone?: string
          photo_url?: string | null
          registered_weight?: number | null
          registration_qr_code_id?: string | null
          registration_status?: string
          school_id?: string | null
          seed?: number | null
          signature_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          weight?: number
          weight_attempts?: Json | null
          weight_division?: string
        }
        Relationships: [
          {
            foreignKeyName: "athletes_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sjjp_events"
            referencedColumns: ["id"]
          },
        ]
      }
      sjjp_brackets: {
        Row: {
          bracket_size: number
          created_at: string | null
          division_id: string
          event_id: string
          group_name: string | null
          id: string
          runner_up_id: string | null
          third_place_winner_id: string | null
          updated_at: string | null
          winner_id: string | null
        }
        Insert: {
          bracket_size?: number
          created_at?: string | null
          division_id: string
          event_id: string
          group_name?: string | null
          id?: string
          runner_up_id?: string | null
          third_place_winner_id?: string | null
          updated_at?: string | null
          winner_id?: string | null
        }
        Update: {
          bracket_size?: number
          created_at?: string | null
          division_id?: string
          event_id?: string
          group_name?: string | null
          id?: string
          runner_up_id?: string | null
          third_place_winner_id?: string | null
          updated_at?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sjjp_brackets_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "sjjp_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sjjp_brackets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sjjp_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sjjp_brackets_runner_up_id_fkey"
            columns: ["runner_up_id"]
            isOneToOne: false
            referencedRelation: "sjjp_athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sjjp_brackets_third_place_winner_id_fkey"
            columns: ["third_place_winner_id"]
            isOneToOne: false
            referencedRelation: "sjjp_athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sjjp_brackets_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "sjjp_athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      sjjp_clubs: {
        Row: {
          app_id: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          app_id: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          app_id?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "clubs_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      sjjp_core_coaches: {
        Row: {
          coach_code: string
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          name: string
          project: string | null
          region: string | null
          supervisor_id: string | null
          updated_at: string | null
        }
        Insert: {
          coach_code: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          name: string
          project?: string | null
          region?: string | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          coach_code?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          name?: string
          project?: string | null
          region?: string | null
          supervisor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sjjp_core_coaches_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "sjjp_core_supervisors"
            referencedColumns: ["id"]
          },
        ]
      }
      sjjp_core_schools: {
        Row: {
          coach_id: string | null
          created_at: string | null
          cycle: string | null
          gender: string | null
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          project: string | null
          region: string | null
          school_code: string
          school_name: string
          supervisor_id: string | null
          system_id: string | null
          updated_at: string | null
        }
        Insert: {
          coach_id?: string | null
          created_at?: string | null
          cycle?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          project?: string | null
          region?: string | null
          school_code: string
          school_name: string
          supervisor_id?: string | null
          system_id?: string | null
          updated_at?: string | null
        }
        Update: {
          coach_id?: string | null
          created_at?: string | null
          cycle?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          project?: string | null
          region?: string | null
          school_code?: string
          school_name?: string
          supervisor_id?: string | null
          system_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sjjp_core_schools_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "sjjp_core_coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sjjp_core_schools_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "sjjp_core_supervisors"
            referencedColumns: ["id"]
          },
        ]
      }
      sjjp_core_settings: {
        Row: {
          description: string | null
          id: number
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          id?: never
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          id?: never
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      sjjp_core_supervisors: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          name: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          is_active?: boolean | null
          last_synced_at?: string | null
          name: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          name?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sjjp_core_sync_logs: {
        Row: {
          created_at: string | null
          errors: Json | null
          id: string
          source_type: string
          status: string
          summary: Json | null
          synced_by: string | null
        }
        Insert: {
          created_at?: string | null
          errors?: Json | null
          id?: string
          source_type: string
          status: string
          summary?: Json | null
          synced_by?: string | null
        }
        Update: {
          created_at?: string | null
          errors?: Json | null
          id?: string
          source_type?: string
          status?: string
          summary?: Json | null
          synced_by?: string | null
        }
        Relationships: []
      }
      sjjp_divisions: {
        Row: {
          age_category_name: string
          app_id: string
          belt: string
          created_at: string | null
          event_id: string
          gender: string
          id: string
          is_enabled: boolean | null
          max_age: number
          max_weight: number
          min_age: number
          name: string
          updated_at: string | null
        }
        Insert: {
          age_category_name: string
          app_id: string
          belt: string
          created_at?: string | null
          event_id: string
          gender: string
          id?: string
          is_enabled?: boolean | null
          max_age: number
          max_weight: number
          min_age: number
          name: string
          updated_at?: string | null
        }
        Update: {
          age_category_name?: string
          app_id?: string
          belt?: string
          created_at?: string | null
          event_id?: string
          gender?: string
          id?: string
          is_enabled?: boolean | null
          max_age?: number
          max_weight?: number
          min_age?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "divisions_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "divisions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sjjp_events"
            referencedColumns: ["id"]
          },
        ]
      }
      sjjp_event_leads: {
        Row: {
          created_at: string | null
          email: string | null
          event_id: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          event_id: string
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          event_id?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sjjp_event_leads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sjjp_events"
            referencedColumns: ["id"]
          },
        ]
      }
      sjjp_event_staff: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          role: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sjjp_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "sjjp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sjjp_events: {
        Row: {
          active_sub_event_id: string | null
          age_division_settings: Json | null
          app_id: string
          banner_url: string | null
          brackets: Json | null
          champion_points: number | null
          check_in_config: Json | null
          check_in_end_time: string | null
          check_in_scan_mode: string | null
          check_in_start_time: string | null
          count_single_club_categories: boolean | null
          count_walkover_single_fight_categories: boolean | null
          count_wo_champion_categories: boolean | null
          created_at: string | null
          description: string | null
          enable_team_separation: boolean | null
          event_date: string
          event_end_date: string | null
          id: string
          include_third_place: boolean | null
          is_active: boolean | null
          is_attendance_mandatory_before_check_in: boolean | null
          is_auto_approve_registrations_enabled: boolean | null
          is_belt_grouping_enabled: boolean | null
          is_bracket_splitting_enabled: boolean | null
          is_lead_capture_enabled: boolean | null
          is_overweight_auto_move_enabled: boolean | null
          is_weight_check_enabled: boolean | null
          mat_assignments: Json | null
          mat_fight_order: Json | null
          max_athletes_per_bracket: number | null
          name: string
          num_fight_areas: number | null
          runner_up_points: number | null
          status: string
          theme: string | null
          third_place_points: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active_sub_event_id?: string | null
          age_division_settings?: Json | null
          app_id?: string
          banner_url?: string | null
          brackets?: Json | null
          champion_points?: number | null
          check_in_config?: Json | null
          check_in_end_time?: string | null
          check_in_scan_mode?: string | null
          check_in_start_time?: string | null
          count_single_club_categories?: boolean | null
          count_walkover_single_fight_categories?: boolean | null
          count_wo_champion_categories?: boolean | null
          created_at?: string | null
          description?: string | null
          enable_team_separation?: boolean | null
          event_date: string
          event_end_date?: string | null
          id?: string
          include_third_place?: boolean | null
          is_active?: boolean | null
          is_attendance_mandatory_before_check_in?: boolean | null
          is_auto_approve_registrations_enabled?: boolean | null
          is_belt_grouping_enabled?: boolean | null
          is_bracket_splitting_enabled?: boolean | null
          is_lead_capture_enabled?: boolean | null
          is_overweight_auto_move_enabled?: boolean | null
          is_weight_check_enabled?: boolean | null
          mat_assignments?: Json | null
          mat_fight_order?: Json | null
          max_athletes_per_bracket?: number | null
          name: string
          num_fight_areas?: number | null
          runner_up_points?: number | null
          status?: string
          theme?: string | null
          third_place_points?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active_sub_event_id?: string | null
          age_division_settings?: Json | null
          app_id?: string
          banner_url?: string | null
          brackets?: Json | null
          champion_points?: number | null
          check_in_config?: Json | null
          check_in_end_time?: string | null
          check_in_scan_mode?: string | null
          check_in_start_time?: string | null
          count_single_club_categories?: boolean | null
          count_walkover_single_fight_categories?: boolean | null
          count_wo_champion_categories?: boolean | null
          created_at?: string | null
          description?: string | null
          enable_team_separation?: boolean | null
          event_date?: string
          event_end_date?: string | null
          id?: string
          include_third_place?: boolean | null
          is_active?: boolean | null
          is_attendance_mandatory_before_check_in?: boolean | null
          is_auto_approve_registrations_enabled?: boolean | null
          is_belt_grouping_enabled?: boolean | null
          is_bracket_splitting_enabled?: boolean | null
          is_lead_capture_enabled?: boolean | null
          is_overweight_auto_move_enabled?: boolean | null
          is_weight_check_enabled?: boolean | null
          mat_assignments?: Json | null
          mat_fight_order?: Json | null
          max_athletes_per_bracket?: number | null
          name?: string
          num_fight_areas?: number | null
          runner_up_points?: number | null
          status?: string
          theme?: string | null
          third_place_points?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_active_sub_event_id_fkey"
            columns: ["active_sub_event_id"]
            isOneToOne: false
            referencedRelation: "sub_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      sjjp_matches: {
        Row: {
          bracket_id: string
          created_at: string | null
          fighter1_id: string | null
          fighter1_is_bye: boolean | null
          fighter2_id: string | null
          fighter2_is_bye: boolean | null
          id: string
          is_third_place_match: boolean | null
          loser_id: string | null
          mat_fight_number: number | null
          match_number: number
          next_match_id: string | null
          prev_match1_id: string | null
          prev_match2_id: string | null
          result_details: string | null
          result_type: string | null
          round: number
          updated_at: string | null
          winner_id: string | null
        }
        Insert: {
          bracket_id: string
          created_at?: string | null
          fighter1_id?: string | null
          fighter1_is_bye?: boolean | null
          fighter2_id?: string | null
          fighter2_is_bye?: boolean | null
          id?: string
          is_third_place_match?: boolean | null
          loser_id?: string | null
          mat_fight_number?: number | null
          match_number: number
          next_match_id?: string | null
          prev_match1_id?: string | null
          prev_match2_id?: string | null
          result_details?: string | null
          result_type?: string | null
          round: number
          updated_at?: string | null
          winner_id?: string | null
        }
        Update: {
          bracket_id?: string
          created_at?: string | null
          fighter1_id?: string | null
          fighter1_is_bye?: boolean | null
          fighter2_id?: string | null
          fighter2_is_bye?: boolean | null
          id?: string
          is_third_place_match?: boolean | null
          loser_id?: string | null
          mat_fight_number?: number | null
          match_number?: number
          next_match_id?: string | null
          prev_match1_id?: string | null
          prev_match2_id?: string | null
          result_details?: string | null
          result_type?: string | null
          round?: number
          updated_at?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sjjp_matches_bracket_id_fkey"
            columns: ["bracket_id"]
            isOneToOne: false
            referencedRelation: "sjjp_brackets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sjjp_matches_fighter1_id_fkey"
            columns: ["fighter1_id"]
            isOneToOne: false
            referencedRelation: "sjjp_athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sjjp_matches_fighter2_id_fkey"
            columns: ["fighter2_id"]
            isOneToOne: false
            referencedRelation: "sjjp_athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sjjp_matches_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "sjjp_athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sjjp_matches_next_match_id_fkey"
            columns: ["next_match_id"]
            isOneToOne: false
            referencedRelation: "sjjp_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sjjp_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "sjjp_athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      sjjp_mod_issue_snapshots: {
        Row: {
          created_at: string | null
          days_open: number
          id: string
          issue_id: string | null
          month_year: string
          notes: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          days_open: number
          id?: string
          issue_id?: string | null
          month_year: string
          notes?: string | null
          status: string
        }
        Update: {
          created_at?: string | null
          days_open?: number
          id?: string
          issue_id?: string | null
          month_year?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sjjp_mod_issue_snapshots_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "sjjp_mod_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      sjjp_mod_issues: {
        Row: {
          action_taken: string | null
          challenge: string
          coach_id: string | null
          created_at: string | null
          id: string
          month_year: string
          priority: string
          resolved_at: string | null
          result: string | null
          school_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          action_taken?: string | null
          challenge: string
          coach_id?: string | null
          created_at?: string | null
          id?: string
          month_year: string
          priority?: string
          resolved_at?: string | null
          result?: string | null
          school_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          action_taken?: string | null
          challenge?: string
          coach_id?: string | null
          created_at?: string | null
          id?: string
          month_year?: string
          priority?: string
          resolved_at?: string | null
          result?: string | null
          school_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sjjp_mod_issues_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "sjjp_core_coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sjjp_mod_issues_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "sjjp_core_schools"
            referencedColumns: ["id"]
          },
        ]
      }
      sjjp_profiles: {
        Row: {
          announcement_duration_seconds: number | null
          app_id: string | null
          avatar_url: string | null
          check_in_increment_seconds: number | null
          club: string | null
          dashboard_opacity: number | null
          enable_sound_notifications: boolean | null
          fighter_image_base_url: string | null
          first_name: string | null
          id: string
          is_approved: boolean | null
          last_name: string | null
          long_break_duration: number | null
          must_change_password: boolean | null
          phone: string | null
          pomodoro_duration: number | null
          prefers_wide_layout: boolean | null
          quote_duration_seconds: number | null
          role: string
          short_break_duration: number | null
          updated_at: string | null
          username: string | null
          xp_points: number | null
        }
        Insert: {
          announcement_duration_seconds?: number | null
          app_id?: string | null
          avatar_url?: string | null
          check_in_increment_seconds?: number | null
          club?: string | null
          dashboard_opacity?: number | null
          enable_sound_notifications?: boolean | null
          fighter_image_base_url?: string | null
          first_name?: string | null
          id: string
          is_approved?: boolean | null
          last_name?: string | null
          long_break_duration?: number | null
          must_change_password?: boolean | null
          phone?: string | null
          pomodoro_duration?: number | null
          prefers_wide_layout?: boolean | null
          quote_duration_seconds?: number | null
          role?: string
          short_break_duration?: number | null
          updated_at?: string | null
          username?: string | null
          xp_points?: number | null
        }
        Update: {
          announcement_duration_seconds?: number | null
          app_id?: string | null
          avatar_url?: string | null
          check_in_increment_seconds?: number | null
          club?: string | null
          dashboard_opacity?: number | null
          enable_sound_notifications?: boolean | null
          fighter_image_base_url?: string | null
          first_name?: string | null
          id?: string
          is_approved?: boolean | null
          last_name?: string | null
          long_break_duration?: number | null
          must_change_password?: boolean | null
          phone?: string | null
          pomodoro_duration?: number | null
          prefers_wide_layout?: boolean | null
          quote_duration_seconds?: number | null
          role?: string
          short_break_duration?: number | null
          updated_at?: string | null
          username?: string | null
          xp_points?: number | null
        }
        Relationships: []
      }
      sjjp_staff_tokens: {
        Row: {
          app_id: string | null
          created_at: string
          current_uses: number
          event_id: string
          expires_at: string | null
          id: string
          last_accessed_at: string | null
          max_uses: number | null
          nickname: string | null
          role: string
          status: string
          token: string
        }
        Insert: {
          app_id?: string | null
          created_at?: string
          current_uses?: number
          event_id: string
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          max_uses?: number | null
          nickname?: string | null
          role: string
          status?: string
          token: string
        }
        Update: {
          app_id?: string | null
          created_at?: string
          current_uses?: number
          event_id?: string
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          max_uses?: number | null
          nickname?: string | null
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "sjjp_staff_tokens_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sjjp_events"
            referencedColumns: ["id"]
          },
        ]
      }
      sjjp_user_authenticators: {
        Row: {
          counter: number
          created_at: string | null
          credential_id: string
          friendly_name: string | null
          id: string
          public_key: Json
          transports: Json | null
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string | null
          credential_id: string
          friendly_name?: string | null
          id?: string
          public_key: Json
          transports?: Json | null
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string | null
          credential_id?: string
          friendly_name?: string | null
          id?: string
          public_key?: Json
          transports?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      sjjpm_attendance: {
        Row: {
          coach_id: string | null
          days: Json | null
          id: string
          month: string
          place_id: string | null
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          coach_id?: string | null
          days?: Json | null
          id?: string
          month: string
          place_id?: string | null
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          coach_id?: string | null
          days?: Json | null
          id?: string
          month?: string
          place_id?: string | null
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sjjpm_attendance_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "sjjpm_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sjjpm_attendance_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "sjjpm_places"
            referencedColumns: ["id"]
          },
        ]
      }
      sjjpm_content: {
        Row: {
          author_id: string | null
          category: string
          content: string | null
          created_at: string | null
          id: string
          parent_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          category: string
          content?: string | null
          created_at?: string | null
          id?: string
          parent_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          category?: string
          content?: string | null
          created_at?: string | null
          id?: string
          parent_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sjjpm_content_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "sjjpm_content"
            referencedColumns: ["id"]
          },
        ]
      }
      sjjpm_content_acks: {
        Row: {
          content_id: string | null
          id: string
          timestamp: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          content_id?: string | null
          id?: string
          timestamp?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          content_id?: string | null
          id?: string
          timestamp?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sjjpm_content_acks_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "sjjpm_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sjjpm_content_acks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "sjjpm_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      sjjpm_daily_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          responses: Json | null
          status: string
          user_id: string
          workplace_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          responses?: Json | null
          status: string
          user_id: string
          workplace_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          responses?: Json | null
          status?: string
          user_id?: string
          workplace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sjjpm_daily_logs_workplace_id_fkey"
            columns: ["workplace_id"]
            isOneToOne: false
            referencedRelation: "sjjpm_workplaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sjjpm_employees: {
        Row: {
          belt: string | null
          created_at: string | null
          dob: string | null
          doj: string | null
          eid: string | null
          email: string | null
          gender: string | null
          id: string
          last_login: string | null
          mobile: string | null
          must_change_password: boolean | null
          name: string
          oracle_id: string | null
          password: string | null
          project: string | null
          ps_number: string | null
          region: string | null
          role: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          belt?: string | null
          created_at?: string | null
          dob?: string | null
          doj?: string | null
          eid?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          last_login?: string | null
          mobile?: string | null
          must_change_password?: boolean | null
          name: string
          oracle_id?: string | null
          password?: string | null
          project?: string | null
          ps_number?: string | null
          region?: string | null
          role: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          belt?: string | null
          created_at?: string | null
          dob?: string | null
          doj?: string | null
          eid?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          last_login?: string | null
          mobile?: string | null
          must_change_password?: boolean | null
          name?: string
          oracle_id?: string | null
          password?: string | null
          project?: string | null
          ps_number?: string | null
          region?: string | null
          role?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sjjpm_leaves: {
        Row: {
          created_at: string | null
          employee_id: string | null
          end_date: string
          id: string
          reason: string | null
          start_date: string
          status: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id?: string | null
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          status?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string | null
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          status?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sjjpm_leaves_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "sjjpm_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      sjjpm_places: {
        Row: {
          active: boolean | null
          city_neighbourhood: string | null
          coordinates: Json | null
          created_at: string | null
          id: string
          name: string
          project: string | null
          region: string
          type: string
        }
        Insert: {
          active?: boolean | null
          city_neighbourhood?: string | null
          coordinates?: Json | null
          created_at?: string | null
          id?: string
          name: string
          project?: string | null
          region: string
          type: string
        }
        Update: {
          active?: boolean | null
          city_neighbourhood?: string | null
          coordinates?: Json | null
          created_at?: string | null
          id?: string
          name?: string
          project?: string | null
          region?: string
          type?: string
        }
        Relationships: []
      }
      sjjpm_workplaces: {
        Row: {
          created_at: string
          form_config: Json
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          form_config?: Json
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          form_config?: Json
          id?: string
          name?: string
        }
        Relationships: []
      }
      sub_events: {
        Row: {
          app_id: string
          attendance_finalized: boolean | null
          created_at: string | null
          end_time: string | null
          event_id: string
          id: string
          name: string
          start_time: string
          user_id: string | null
        }
        Insert: {
          app_id?: string
          attendance_finalized?: boolean | null
          created_at?: string | null
          end_time?: string | null
          event_id: string
          id?: string
          name: string
          start_time: string
          user_id?: string | null
        }
        Update: {
          app_id?: string
          attendance_finalized?: boolean | null
          created_at?: string | null
          end_time?: string | null
          event_id?: string
          id?: string
          name?: string
          start_time?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_events_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sjjp_events"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          app_id: string
          depends_on_task_id: string
          task_id: string
        }
        Insert: {
          app_id: string
          depends_on_task_id: string
          task_id: string
        }
        Update: {
          app_id?: string
          depends_on_task_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      task_interruptions: {
        Row: {
          app_id: string
          duration_seconds: number | null
          id: number
          interrupted_at: string | null
          task_id: string | null
          user_id: string | null
        }
        Insert: {
          app_id: string
          duration_seconds?: number | null
          id?: number
          interrupted_at?: string | null
          task_id?: string | null
          user_id?: string | null
        }
        Update: {
          app_id?: string
          duration_seconds?: number | null
          id?: number
          interrupted_at?: string | null
          task_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_interruptions_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      task_personnel_link: {
        Row: {
          app_id: string
          personnel_id: string
          task_id: string
        }
        Insert: {
          app_id?: string
          personnel_id: string
          task_id: string
        }
        Update: {
          app_id?: string
          personnel_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_personnel_link_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_personnel_link_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          app_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          app_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      taskboard_tasks: {
        Row: {
          created: string | null
          id: string
          note: string | null
          owner: string
          status: string
          title: string
          updated: string
        }
        Insert: {
          created?: string | null
          id: string
          note?: string | null
          owner: string
          status: string
          title: string
          updated: string
        }
        Update: {
          created?: string | null
          id?: string
          note?: string | null
          owner?: string
          status?: string
          title?: string
          updated?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          app_id: string
          category: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          event_id: string | null
          hashtags: string[] | null
          id: string
          priority: string | null
          project_id: string | null
          sort_order: number | null
          status: string
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          app_id?: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          hashtags?: string[] | null
          id?: string
          priority?: string | null
          project_id?: string | null
          sort_order?: number | null
          status?: string
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          app_id?: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          hashtags?: string[] | null
          id?: string
          priority?: string | null
          project_id?: string | null
          sort_order?: number | null
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sjjp_events"
            referencedColumns: ["id"]
          },
        ]
      }
      time_logs: {
        Row: {
          app_id: string
          duration_seconds: number
          id: number
          logged_at: string | null
          task_id: string | null
          user_id: string | null
        }
        Insert: {
          app_id: string
          duration_seconds: number
          id?: number
          logged_at?: string | null
          task_id?: string | null
          user_id?: string | null
        }
        Update: {
          app_id?: string
          duration_seconds?: number
          id?: number
          logged_at?: string | null
          task_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_logs_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      uaew_access_tokens: {
        Row: {
          allowed_modules: Json | null
          code: string
          created_at: string
          created_by: string | null
          is_active: boolean | null
          name: string
          role: string
          usage_count: number | null
        }
        Insert: {
          allowed_modules?: Json | null
          code: string
          created_at?: string
          created_by?: string | null
          is_active?: boolean | null
          name: string
          role: string
          usage_count?: number | null
        }
        Update: {
          allowed_modules?: Json | null
          code?: string
          created_at?: string
          created_by?: string | null
          is_active?: boolean | null
          name?: string
          role?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "uaew_access_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "uaew_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      uaew_event_roster: {
        Row: {
          associated_athlete: string | null
          athlete_name: string
          created_at: string
          created_by: string | null
          event: string
          event_name: string | null
          id: string
          is_active: boolean | null
          needs_flight: boolean | null
          role: string
          updated_at: string
        }
        Insert: {
          associated_athlete?: string | null
          athlete_name: string
          created_at?: string
          created_by?: string | null
          event: string
          event_name?: string | null
          id?: string
          is_active?: boolean | null
          needs_flight?: boolean | null
          role: string
          updated_at?: string
        }
        Update: {
          associated_athlete?: string | null
          athlete_name?: string
          created_at?: string
          created_by?: string | null
          event?: string
          event_name?: string | null
          id?: string
          is_active?: boolean | null
          needs_flight?: boolean | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "uaew_event_roster_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "uaew_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      uaew_flight_requests: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          passport_expiry: string | null
          passport_number: string | null
          roster_entry_id: string | null
          updated_at: string
          visa_status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          roster_entry_id?: string | null
          updated_at?: string
          visa_status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          roster_entry_id?: string | null
          updated_at?: string
          visa_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uaew_flight_requests_roster_entry_id_fkey"
            columns: ["roster_entry_id"]
            isOneToOne: true
            referencedRelation: "uaew_event_roster"
            referencedColumns: ["id"]
          },
        ]
      }
      uaew_profiles: {
        Row: {
          allowed_modules: Json | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: string | null
          status: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          allowed_modules?: Json | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: string | null
          status?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          allowed_modules?: Json | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: string | null
          status?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      uaew_settings: {
        Row: {
          active_events: Json | null
          key: string
          roles: Json | null
          sidebar_mode: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active_events?: Json | null
          key: string
          roles?: Json | null
          sidebar_mode?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active_events?: Json | null
          key?: string
          roles?: Json | null
          sidebar_mode?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uaew_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "uaew_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      uaewapp_attendance: {
        Row: {
          athlete_id: string
          checkin_number: number | null
          created_at: string | null
          event: string | null
          fighter_name: string | null
          id: string
          name: string | null
          notes: string | null
          status: string
          task: string
          timestamp: string | null
          timestamp_alt: string | null
          user_name: string | null
        }
        Insert: {
          athlete_id: string
          checkin_number?: number | null
          created_at?: string | null
          event?: string | null
          fighter_name?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          status: string
          task: string
          timestamp?: string | null
          timestamp_alt?: string | null
          user_name?: string | null
        }
        Update: {
          athlete_id?: string
          checkin_number?: number | null
          created_at?: string | null
          event?: string | null
          fighter_name?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          status?: string
          task?: string
          timestamp?: string | null
          timestamp_alt?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      visa_requests: {
        Row: {
          application_date: string | null
          application_form_url: string | null
          approval_date: string | null
          assigned_to: string | null
          created_at: string | null
          id: string
          notes: string | null
          roster_entry_id: string
          status: string | null
          visa_number: string | null
          visa_type: string | null
        }
        Insert: {
          application_date?: string | null
          application_form_url?: string | null
          approval_date?: string | null
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          roster_entry_id: string
          status?: string | null
          visa_number?: string | null
          visa_type?: string | null
        }
        Update: {
          application_date?: string | null
          application_form_url?: string | null
          approval_date?: string | null
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          roster_entry_id?: string
          status?: string | null
          visa_number?: string | null
          visa_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visa_requests_roster_entry_id_fkey"
            columns: ["roster_entry_id"]
            isOneToOne: false
            referencedRelation: "event_roster"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reviews: {
        Row: {
          app_id: string
          created_at: string | null
          id: number
          user_id: string | null
          week_start_date: string
          what_can_be_improved: string | null
          what_went_well: string | null
        }
        Insert: {
          app_id: string
          created_at?: string | null
          id?: number
          user_id?: string | null
          week_start_date: string
          what_can_be_improved?: string | null
          what_went_well?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string | null
          id?: number
          user_id?: string | null
          week_start_date?: string
          what_can_be_improved?: string | null
          what_went_well?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reviews_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "sjjp_apps"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      batch_extract_fighter_ids: { Args: never; Returns: number }
      check_psychologist_access: {
        Args: { target_patient_id: string }
        Returns: boolean
      }
      claim_all_user_data: { Args: never; Returns: undefined }
      claim_events_for_user: { Args: never; Returns: undefined }
      create_recurring_tasks: { Args: never; Returns: undefined }
      delete_personnel_and_links: {
        Args: { p_personnel_id: string }
        Returns: undefined
      }
      generate_unique_code: { Args: never; Returns: string }
      get_email_from_username: { Args: { p_username: string }; Returns: string }
      get_event_dashboard_metrics: {
        Args: { p_event_id: string }
        Returns: Json
      }
      get_unique_hashtags_for_user: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      get_user_events_with_counts: {
        Args: { p_user_id: string }
        Returns: {
          action_count: number
          banner_url: string
          event_date: string
          event_end_date: string
          id: string
          name: string
          status: string
          sub_event_count: number
          task_count: number
        }[]
      }
      increment_xp: {
        Args: { amount: number; user_id: string }
        Returns: undefined
      }
      is_active_user: { Args: never; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      is_authenticated: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      match_notes:
        | {
            Args: {
              match_count: number
              match_threshold: number
              query_embedding: string
            }
            Returns: {
              content: string
              hashtags: string[]
              id: string
              project: string
              similarity: number
            }[]
          }
        | {
            Args: {
              match_count: number
              match_threshold: number
              query_embedding: string
              query_text: string
            }
            Returns: {
              content: string
              hashtags: string[]
              id: string
              project: string
              similarity: number
            }[]
          }
      search_personnel:
        | {
            Args: { search_term: string }
            Returns: {
              app_id: string
              compiled_name: string | null
              copy_url: string | null
              created_at: string | null
              dob: string | null
              expiry_date: string | null
              fighter_id: number | null
              folder_url: string | null
              gender: string | null
              id: string
              index: number | null
              last_edition: string | null
              name: string | null
              nationality: string | null
              nickname: string | null
              passport: string | null
              phone: string | null
              photo_url: string | null
              ps_number: string | null
              surname: string | null
              uaew_app_id: string | null
              updated_at: string | null
              user_id: string | null
              validation_status: string | null
            }[]
            SetofOptions: {
              from: "*"
              to: "personnel"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: { p_limit: number; p_offset: number; search_term: string }
            Returns: {
              app_id: string
              compiled_name: string
              copy_url: string
              dob: string
              expiry_date: string
              fighter_id: number
              folder_url: string
              gender: string
              id: string
              index: number
              last_edition: string
              name: string
              nationality: string
              nickname: string
              passport: string
              phone: string
              photo_url: string
              ps_number: string
              surname: string
              total_count: number
              uaew_app_id: string
              user_id: string
              validation_status: string
            }[]
          }
      update_match_result_v2: {
        Args: {
          p_bracket_id: string
          p_bracket_runner_up_id?: string
          p_bracket_winner_id?: string
          p_event_id: string
          p_match_data: Json
          p_match_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      check_in_status: "active" | "completed" | "no_show" | "cancelled"
      recurrence_type: "daily" | "weekly" | "monthly"
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
      check_in_status: ["active", "completed", "no_show", "cancelled"],
      recurrence_type: ["daily", "weekly", "monthly"],
    },
  },
} as const
