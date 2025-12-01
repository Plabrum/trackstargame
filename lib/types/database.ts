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
    PostgrestVersion: "13.0.5"
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
        ]
      }
      game_sessions: {
        Row: {
          allow_host_to_play: boolean
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
      pack_tracks: {
        Row: {
          created_at: string | null
          id: string
          pack_id: string
          position: number | null
          track_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pack_id: string
          position?: number | null
          track_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pack_id?: string
          position?: number | null
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pack_tracks_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pack_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
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
          tags: string[] | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          tags?: string[] | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          tags?: string[] | null
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
          album_name: string | null
          artist: string
          created_at: string | null
          genres: string[] | null
          id: string
          isrc: string | null
          primary_genre: string | null
          release_year: number | null
          spotify_id: string
          spotify_popularity: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          album_name?: string | null
          artist: string
          created_at?: string | null
          genres?: string[] | null
          id?: string
          isrc?: string | null
          primary_genre?: string | null
          release_year?: number | null
          spotify_id: string
          spotify_popularity?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          album_name?: string | null
          artist?: string
          created_at?: string | null
          genres?: string[] | null
          id?: string
          isrc?: string | null
          primary_genre?: string | null
          release_year?: number | null
          spotify_id?: string
          spotify_popularity?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_round: {
        Args: { p_session_id: string }
        Returns: {
          new_round: number
          new_state: string
          session_id: string
          track_id: string
        }[]
      }
      finalize_judgments: {
        Args: { p_overrides?: Json; p_session_id: string }
        Returns: {
          leaderboard: Json
          success: boolean
        }[]
      }
      increment_player_score: {
        Args: { player_id: string; points: number }
        Returns: undefined
      }
      judge_answer: {
        Args: { p_correct: boolean; p_session_id: string }
        Returns: {
          buzzer_player_id: string
          correct: boolean
          new_player_score: number
          points_awarded: number
          round_id: string
        }[]
      }
      reset_game: {
        Args: { p_new_pack_id: string; p_session_id: string }
        Returns: {
          first_round: number
          first_track_id: string
          new_state: string
          session_id: string
        }[]
      }
      start_game: {
        Args: { p_session_id: string }
        Returns: {
          current_round: number
          first_track_id: string
          id: string
          state: string
        }[]
      }
      submit_answer: {
        Args: {
          p_answer: string
          p_auto_validated: boolean
          p_player_id: string
          p_points_awarded: number
          p_session_id: string
        }
        Returns: {
          all_players_submitted: boolean
          answer_id: string
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
