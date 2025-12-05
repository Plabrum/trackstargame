DROP INDEX "idx_artists_name_lower";--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "popularity_score" numeric;--> statement-breakpoint
CREATE INDEX "idx_tracks_popularity_score" ON "tracks" USING btree ("popularity_score" numeric_ops) WHERE (popularity_score IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_artists_name_lower" ON "artists" USING btree (lower(name));--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_name_key" UNIQUE("name");