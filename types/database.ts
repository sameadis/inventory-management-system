/**
 * Database type definitions for Supabase
 * 
 * To generate types from your Supabase schema, run:
 * npx supabase gen types typescript --project-id your-project-ref > types/database.ts
 * 
 * For now, we'll use a basic structure that matches our schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];

export interface Database {
  public: {
    Tables: {
      church_branch: {
        Row: {
          id: string;
          name: string;
          location: string | null;
          contact_info: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location?: string | null;
          contact_info?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          location?: string | null;
          contact_info?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      ministry: {
        Row: {
          id: string;
          name: string;
          church_branch_id: string;
          contact_info: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          church_branch_id: string;
          contact_info?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          church_branch_id?: string;
          contact_info?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      roles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role_id: string;
          assigned_at: string;
          assigned_by: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          role_id: string;
          assigned_at?: string;
          assigned_by?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          role_id?: string;
          assigned_at?: string;
          assigned_by?: string | null;
        };
      };
      user_profile: {
        Row: {
          id: string;
          full_name: string | null;
          church_branch_id: string;
          ministry_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          church_branch_id: string;
          ministry_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          church_branch_id?: string;
          ministry_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_branch_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      user_has_role: {
        Args: { role_name: string };
        Returns: boolean;
      };
      is_system_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_asset_manager: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_ministry_leader: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      get_user_emails: {
        Args: { user_ids: string[] };
        Returns: Array<{ user_id: string; email: string }>;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
  inventory: {
    Tables: {
      asset: {
        Row: {
          id: string;
          asset_tag_number: string;
          asset_description: string;
          category: string;
          model_or_serial_number: string | null;
          quantity: number;
          unit_of_measure: string;
          acquisition_date: string;
          acquisition_cost: number;
          estimated_useful_life_years: number | null;
          depreciation_method: string | null;
          ministry_assigned: string;
          physical_location: string;
          responsible_ministry_leader: string | null;
          current_condition: "New" | "Good" | "Fair" | "Poor";
          asset_status: "active" | "disposed" | "missing";
          last_verified_date: string | null;
          remarks: string | null;
          church_branch_id: string;
          prepared_by: string;
          reviewed_by: string | null;
          approved_by: string | null;
          date_of_entry: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          asset_tag_number: string;
          asset_description: string;
          category: string;
          model_or_serial_number?: string | null;
          quantity?: number;
          unit_of_measure?: string;
          acquisition_date: string;
          acquisition_cost: number;
          estimated_useful_life_years?: number | null;
          depreciation_method?: string | null;
          ministry_assigned: string;
          physical_location: string;
          responsible_ministry_leader?: string | null;
          current_condition: "New" | "Good" | "Fair" | "Poor";
          asset_status?: "active" | "disposed" | "missing";
          last_verified_date?: string | null;
          remarks?: string | null;
          church_branch_id: string;
          prepared_by: string;
          reviewed_by?: string | null;
          approved_by?: string | null;
          date_of_entry?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          asset_tag_number?: string;
          asset_description?: string;
          category?: string;
          model_or_serial_number?: string | null;
          quantity?: number;
          unit_of_measure?: string;
          acquisition_date?: string;
          acquisition_cost?: number;
          estimated_useful_life_years?: number | null;
          depreciation_method?: string | null;
          ministry_assigned?: string;
          physical_location?: string;
          responsible_ministry_leader?: string | null;
          current_condition?: "New" | "Good" | "Fair" | "Poor";
          asset_status?: "active" | "disposed" | "missing";
          last_verified_date?: string | null;
          remarks?: string | null;
          church_branch_id?: string;
          prepared_by?: string;
          reviewed_by?: string | null;
          approved_by?: string | null;
          date_of_entry?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      verification_history: {
        Row: {
          id: string;
          asset_id: string;
          verification_date: string;
          condition: "New" | "Good" | "Fair" | "Poor";
          physical_location_at_verification: string;
          remarks: string | null;
          verified_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          asset_id: string;
          verification_date: string;
          condition: "New" | "Good" | "Fair" | "Poor";
          physical_location_at_verification: string;
          remarks?: string | null;
          verified_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          asset_id?: string;
          verification_date?: string;
          condition?: "New" | "Good" | "Fair" | "Poor";
          physical_location_at_verification?: string;
          remarks?: string | null;
          verified_by?: string;
          created_at?: string;
        };
      };
      transfer_history: {
        Row: {
          id: string;
          asset_id: string;
          previous_ministry: string;
          new_ministry: string;
          previous_location: string;
          new_location: string;
          requested_by: string;
          approved_by: string | null;
          transfer_date: string | null;
          remarks: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          asset_id: string;
          previous_ministry: string;
          new_ministry: string;
          previous_location: string;
          new_location: string;
          requested_by: string;
          approved_by?: string | null;
          transfer_date?: string | null;
          remarks?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          asset_id?: string;
          previous_ministry?: string;
          new_ministry?: string;
          previous_location?: string;
          new_location?: string;
          requested_by?: string;
          approved_by?: string | null;
          transfer_date?: string | null;
          remarks?: string | null;
          created_at?: string;
        };
      };
      disposal_history: {
        Row: {
          id: string;
          asset_id: string;
          disposal_method: "Sold" | "Donated" | "WrittenOff";
          disposal_date: string;
          disposal_value: number;
          requested_by: string;
          approved_by: string | null;
          remarks: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          asset_id: string;
          disposal_method: "Sold" | "Donated" | "WrittenOff";
          disposal_date: string;
          disposal_value: number;
          requested_by: string;
          approved_by?: string | null;
          remarks?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          asset_id?: string;
          disposal_method?: "Sold" | "Donated" | "WrittenOff";
          disposal_date?: string;
          disposal_value?: number;
          requested_by?: string;
          approved_by?: string | null;
          remarks?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

