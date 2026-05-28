export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      engagements: {
        Row: {
          id: string
          firm_id: string | null
          created_by: string | null
          client_name: string
          industry: string | null
          deck_type: string
          engagement_goal: string | null
          timeline: string | null
          constraints: string | null
          status: string | null
          requirements_json: Json | null
          research_brief: Json | null
          storyline_json: Json | null
          draft_content: Json | null
          quality_report: Json | null
          output_slides_url: string | null
          revision_gate: number | null
          revision_notes: string | null
          contact_name: string | null
          contact_email: string | null
          company_size: string | null
          project_name: string | null
          budget: string | null
          additional_context: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          firm_id?: string | null
          created_by?: string | null
          client_name: string
          industry?: string | null
          deck_type: string
          engagement_goal?: string | null
          timeline?: string | null
          constraints?: string | null
          status?: string | null
          requirements_json?: Json | null
          research_brief?: Json | null
          storyline_json?: Json | null
          draft_content?: Json | null
          quality_report?: Json | null
          output_slides_url?: string | null
          revision_gate?: number | null
          revision_notes?: string | null
          contact_name?: string | null
          contact_email?: string | null
          company_size?: string | null
          project_name?: string | null
          budget?: string | null
          additional_context?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          firm_id?: string | null
          created_by?: string | null
          client_name?: string
          industry?: string | null
          deck_type?: string
          engagement_goal?: string | null
          timeline?: string | null
          constraints?: string | null
          status?: string | null
          requirements_json?: Json | null
          research_brief?: Json | null
          storyline_json?: Json | null
          draft_content?: Json | null
          quality_report?: Json | null
          output_slides_url?: string | null
          revision_gate?: number | null
          revision_notes?: string | null
          contact_name?: string | null
          contact_email?: string | null
          company_size?: string | null
          project_name?: string | null
          budget?: string | null
          additional_context?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      firms: {
        Row: {
          id: string
          name: string
          template_slides_url: string | null
          drive_folder_id: string | null
          pinecone_namespace: string | null
          demo_mode: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          template_slides_url?: string | null
          drive_folder_id?: string | null
          pinecone_namespace?: string | null
          demo_mode?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          template_slides_url?: string | null
          drive_folder_id?: string | null
          pinecone_namespace?: string | null
          demo_mode?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          name: string
          email: string
          firm_id: string | null
          role: string | null
          created_at: string | null
        }
        Insert: {
          id: string
          name: string
          email: string
          firm_id?: string | null
          role?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          firm_id?: string | null
          role?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      gates: {
        Row: {
          id: string
          engagement_id: string | null
          gate_number: number
          gate_name: string
          status: string | null
          reviewer_id: string | null
          notes: string | null
          slack_ts: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          engagement_id?: string | null
          gate_number: number
          gate_name: string
          status?: string | null
          reviewer_id?: string | null
          notes?: string | null
          slack_ts?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          engagement_id?: string | null
          gate_number?: number
          gate_name?: string
          status?: string | null
          reviewer_id?: string | null
          notes?: string | null
          slack_ts?: string | null
          created_at?: string | null
          updated_at?: string | null
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
  }
}
