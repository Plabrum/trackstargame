export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      game_rounds: {
        Row: {
          buzz_time: string | null
          buzzer_player_id: string | null
          correct: boolean | null
          created_at: string | null
          elapsed_seconds: number | null
          id: string
          points_awarded: number | null
          round_number: number
          session_id: string | null
          track_id: string | null
        }
        Insert: {
          buzz_time?: string | null
          buzzer_player_id?: string | null
          correct?: boolean | null
          created_at?: string | null
          elapsed_seconds?: number | null
          id?: string
          points_awarded?: number | null
          round_number: number
          session_id?: string | null
          track_id?: string | null
        }
        Update: {
          buzz_time?: string | null
          buzzer_player_id?: string | null
          correct?: boolean | null
          created_at?: string | null
          elapsed_seconds?: number | null
          id?: string
          points_awarded?: number | null
          round_number?: number
          session_id?: string | null
          track_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_rounds_buzzer_player_id_fkey"
            columns: ["buzzer_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_rounds_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_rounds_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          allow_host_to_play: boolean
          allow_single_user: boolean
          created_at: string | null
          current_round: number | null
          enable_text_input_mode: boolean
          host_name: string
          id: string
          pack_id: string | null
          round_start_time: string | null
          state: string | null
          total_rounds: number
          updated_at: string | null
        }
        Insert: {
          allow_host_to_play?: boolean
          allow_single_user?: boolean
          created_at?: string | null
          current_round?: number | null
          enable_text_input_mode?: boolean
          host_name: string
          id?: string
          pack_id?: string | null
          round_start_time?: string | null
          state?: string | null
          total_rounds?: number
          updated_at?: string | null
        }
        Update: {
          allow_host_to_play?: boolean
          allow_single_user?: boolean
          created_at?: string | null
          current_round?: number | null
          enable_text_input_mode?: boolean
          host_name?: string
          id?: string
          pack_id?: string | null
          round_start_time?: string | null
          state?: string | null
          total_rounds?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
        ]
      }
      packs: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          id: string
          is_host: boolean
          joined_at: string | null
          name: string
          score: number | null
          session_id: string | null
        }
        Insert: {
          id?: string
          is_host?: boolean
          joined_at?: string | null
          name: string
          score?: number | null
          session_id?: string | null
        }
        Update: {
          id?: string
          is_host?: boolean
          joined_at?: string | null
          name?: string
          score?: number | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      round_answers: {
        Row: {
          auto_validated: boolean | null
          id: string
          is_correct: boolean | null
          player_id: string
          points_awarded: number | null
          round_id: string
          submitted_answer: string
          submitted_at: string | null
        }
        Insert: {
          auto_validated?: boolean | null
          id?: string
          is_correct?: boolean | null
          player_id: string
          points_awarded?: number | null
          round_id: string
          submitted_answer: string
          submitted_at?: string | null
        }
        Update: {
          auto_validated?: boolean | null
          id?: string
          is_correct?: boolean | null
          player_id?: string
          points_awarded?: number | null
          round_id?: string
          submitted_answer?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "round_answers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_answers_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "game_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          artist: string
          created_at: string | null
          id: string
          pack_id: string | null
          spotify_id: string
          title: string
        }
        Insert: {
          artist: string
          created_at?: string | null
          id?: string
          pack_id?: string | null
          spotify_id: string
          title: string
        }
        Update: {
          artist?: string
          created_at?: string | null
          id?: string
          pack_id?: string | null
          spotify_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracks_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_player_score: {
        Args: {
          player_id: string
          points: number
        }
        Returns: undefined
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

