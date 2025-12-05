-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "packs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"tags" text[] DEFAULT '{""}'
);
--> statement-breakpoint
ALTER TABLE "packs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"host_name" text NOT NULL,
	"pack_id" uuid,
	"current_round" integer DEFAULT 0,
	"state" text DEFAULT 'lobby',
	"round_start_time" timestamp with time zone,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"allow_host_to_play" boolean DEFAULT true NOT NULL,
	"total_rounds" integer DEFAULT 10 NOT NULL,
	"enable_text_input_mode" boolean DEFAULT true NOT NULL,
	"difficulty" text DEFAULT 'medium',
	CONSTRAINT "difficulty_valid_values" CHECK (difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text, 'legendary'::text])),
	CONSTRAINT "total_rounds_range" CHECK ((total_rounds >= 1) AND (total_rounds <= 50)),
	CONSTRAINT "valid_current_round" CHECK ((current_round >= 0) AND (current_round <= 50)),
	CONSTRAINT "valid_game_state" CHECK (state = ANY (ARRAY['lobby'::text, 'playing'::text, 'buzzed'::text, 'reveal'::text, 'submitted'::text, 'finished'::text])),
	CONSTRAINT "valid_total_rounds" CHECK ((total_rounds >= 1) AND (total_rounds <= 50))
);
--> statement-breakpoint
ALTER TABLE "game_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"session_id" uuid,
	"name" text NOT NULL,
	"score" integer DEFAULT 0,
	"joined_at" timestamp DEFAULT now(),
	"is_host" boolean DEFAULT false NOT NULL,
	CONSTRAINT "players_session_id_name_key" UNIQUE("session_id","name"),
	CONSTRAINT "reasonable_score" CHECK ((score >= '-1000'::integer) AND (score <= 10000))
);
--> statement-breakpoint
ALTER TABLE "players" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "game_rounds" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"session_id" uuid,
	"round_number" integer NOT NULL,
	"track_id" uuid,
	"buzzer_player_id" uuid,
	"buzz_time" timestamp,
	"elapsed_seconds" numeric(8, 2),
	"correct" boolean,
	"points_awarded" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_session_round" UNIQUE("session_id","round_number"),
	CONSTRAINT "judged_rounds_have_points" CHECK (((correct IS NULL) AND (points_awarded IS NULL)) OR ((correct IS NOT NULL) AND (points_awarded IS NOT NULL))),
	CONSTRAINT "positive_round_number" CHECK (round_number > 0),
	CONSTRAINT "valid_elapsed_seconds" CHECK ((elapsed_seconds IS NULL) OR ((elapsed_seconds >= (0)::numeric) AND (elapsed_seconds <= (30)::numeric)))
);
--> statement-breakpoint
ALTER TABLE "game_rounds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "round_answers" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"round_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"submitted_answer" text NOT NULL,
	"auto_validated" boolean,
	"is_correct" boolean,
	"points_awarded" integer DEFAULT 0,
	"submitted_at" timestamp DEFAULT now(),
	CONSTRAINT "round_answers_round_id_player_id_key" UNIQUE("round_id","player_id")
);
--> statement-breakpoint
ALTER TABLE "round_answers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"spotify_artist_id" text,
	"genres" text[],
	"spotify_followers" integer,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "artists_spotify_artist_id_key" UNIQUE("spotify_artist_id")
);
--> statement-breakpoint
CREATE TABLE "pack_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"position" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "pack_tracks_pack_track_unique" UNIQUE("pack_id","track_id")
);
--> statement-breakpoint
CREATE TABLE "track_artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "track_artists_track_artist_unique" UNIQUE("track_id","artist_id"),
	CONSTRAINT "track_artists_track_position_unique" UNIQUE("track_id","position"),
	CONSTRAINT "track_artists_position_positive" CHECK ("position" > 0)
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spotify_id" text NOT NULL,
	"title" text NOT NULL,
	"album_name" text,
	"release_year" integer,
	"spotify_popularity" integer,
	"isrc" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"album_image_url" text,
	CONSTRAINT "tracks_spotify_id_unique" UNIQUE("spotify_id"),
	CONSTRAINT "tracks_spotify_popularity_range" CHECK ((spotify_popularity >= 0) AND (spotify_popularity <= 100))
);
--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "public"."packs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_rounds" ADD CONSTRAINT "game_rounds_buzzer_player_id_fkey" FOREIGN KEY ("buzzer_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_rounds" ADD CONSTRAINT "game_rounds_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_answers" ADD CONSTRAINT "round_answers_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_answers" ADD CONSTRAINT "round_answers_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."game_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_tracks" ADD CONSTRAINT "pack_tracks_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "public"."packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_tracks" ADD CONSTRAINT "pack_tracks_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_artists" ADD CONSTRAINT "track_artists_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_artists" ADD CONSTRAINT "track_artists_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_packs_tags" ON "packs" USING gin ("tags" array_ops);--> statement-breakpoint
CREATE INDEX "idx_game_sessions_difficulty" ON "game_sessions" USING btree ("difficulty" text_ops);--> statement-breakpoint
CREATE INDEX "idx_game_sessions_state" ON "game_sessions" USING btree ("state" text_ops);--> statement-breakpoint
CREATE INDEX "idx_players_is_host" ON "players" USING btree ("session_id" bool_ops,"is_host" uuid_ops) WHERE (is_host = true);--> statement-breakpoint
CREATE INDEX "idx_players_session_id" ON "players" USING btree ("session_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_game_rounds_session_id" ON "game_rounds" USING btree ("session_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "unique_buzzer_per_round" ON "game_rounds" USING btree ("session_id" int4_ops,"round_number" int4_ops) WHERE (buzzer_player_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_round_answers_player_id" ON "round_answers" USING btree ("player_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_round_answers_round_id" ON "round_answers" USING btree ("round_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_artists_genres" ON "artists" USING gin ("genres" array_ops) WHERE (genres IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_artists_name" ON "artists" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_artists_name_lower" ON "artists" USING btree (lower(name) text_ops);--> statement-breakpoint
CREATE INDEX "idx_artists_spotify_id" ON "artists" USING btree ("spotify_artist_id" text_ops) WHERE (spotify_artist_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_pack_tracks_pack_id" ON "pack_tracks" USING btree ("pack_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_pack_tracks_position" ON "pack_tracks" USING btree ("pack_id" uuid_ops,"position" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_pack_tracks_track_id" ON "pack_tracks" USING btree ("track_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_track_artists_artist_id" ON "track_artists" USING btree ("artist_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_track_artists_position" ON "track_artists" USING btree ("track_id" int4_ops,"position" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_track_artists_track_id" ON "track_artists" USING btree ("track_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_tracks_has_image" ON "tracks" USING btree ("album_image_url" text_ops) WHERE (album_image_url IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_tracks_isrc" ON "tracks" USING btree ("isrc" text_ops);--> statement-breakpoint
CREATE INDEX "idx_tracks_spotify_id" ON "tracks" USING btree ("spotify_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_tracks_spotify_popularity" ON "tracks" USING btree ("spotify_popularity" int4_ops);--> statement-breakpoint
CREATE POLICY "Anyone can read packs" ON "packs" AS PERMISSIVE FOR SELECT TO public USING (true);--> statement-breakpoint
CREATE POLICY "Can delete lobby or finished games" ON "game_sessions" AS PERMISSIVE FOR DELETE TO public USING ((state = ANY (ARRAY['lobby'::text, 'finished'::text])));--> statement-breakpoint
CREATE POLICY "Anyone can update game sessions" ON "game_sessions" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Anyone can create game sessions" ON "game_sessions" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Anyone can read game sessions" ON "game_sessions" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Players can be removed" ON "players" AS PERMISSIVE FOR DELETE TO public USING (true);--> statement-breakpoint
CREATE POLICY "Players can update self" ON "players" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Can join lobby sessions" ON "players" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Anyone can read players" ON "players" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Rounds cannot be deleted" ON "game_rounds" AS PERMISSIVE FOR DELETE TO public USING (false);--> statement-breakpoint
CREATE POLICY "Can buzz in playing state" ON "game_rounds" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Only functions create rounds" ON "game_rounds" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Anyone can read rounds" ON "game_rounds" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Answers can be updated" ON "round_answers" AS PERMISSIVE FOR UPDATE TO public USING (true);--> statement-breakpoint
CREATE POLICY "Players can submit answers" ON "round_answers" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "Anyone can read answers" ON "round_answers" AS PERMISSIVE FOR SELECT TO public;
*/