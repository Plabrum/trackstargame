import { pgTable, index, foreignKey, pgPolicy, check, uuid, text, timestamp, integer, uniqueIndex, unique, numeric, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const tracksOldBackup = pgTable("tracks_old_backup", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	packId: uuid("pack_id"),
	title: text().notNull(),
	artist: text().notNull(),
	spotifyId: text("spotify_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	releaseYear: integer("release_year"),
	albumName: text("album_name"),
	primaryGenre: text("primary_genre"),
	genres: text().array(),
	spotifyPopularity: integer("spotify_popularity"),
	isrc: text(),
}, (table) => [
	index("idx_tracks_genres").using("gin", table.genres.asc().nullsLast().op("array_ops")),
	index("idx_tracks_pack_id").using("btree", table.packId.asc().nullsLast().op("uuid_ops")),
	index("idx_tracks_primary_genre").using("btree", table.primaryGenre.asc().nullsLast().op("text_ops")),
	index("idx_tracks_release_year").using("btree", table.releaseYear.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.packId],
			foreignColumns: [packs.id],
			name: "tracks_pack_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Anyone can read tracks", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	check("spotify_popularity_range", sql`(spotify_popularity >= 0) AND (spotify_popularity <= 100)`),
]);

export const packs = pgTable("packs", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	tags: text().array().default([""]),
}, (table) => [
	index("idx_packs_tags").using("gin", table.tags.asc().nullsLast().op("array_ops")),
	pgPolicy("Anyone can read packs", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
]);

export const gameRounds = pgTable("game_rounds", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	sessionId: uuid("session_id"),
	roundNumber: integer("round_number").notNull(),
	trackId: uuid("track_id"),
	buzzerPlayerId: uuid("buzzer_player_id"),
	buzzTime: timestamp("buzz_time", { mode: 'string' }),
	elapsedSeconds: numeric("elapsed_seconds", { precision: 8, scale:  2 }),
	correct: boolean(),
	pointsAwarded: integer("points_awarded"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_game_rounds_session_id").using("btree", table.sessionId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("unique_buzzer_per_round").using("btree", table.sessionId.asc().nullsLast().op("int4_ops"), table.roundNumber.asc().nullsLast().op("uuid_ops")).where(sql`(buzzer_player_id IS NOT NULL)`),
	foreignKey({
			columns: [table.trackId],
			foreignColumns: [tracks.id],
			name: "game_rounds_track_id_fkey"
		}),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [gameSessions.id],
			name: "game_rounds_session_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.buzzerPlayerId],
			foreignColumns: [players.id],
			name: "game_rounds_buzzer_player_id_fkey"
		}),
	unique("unique_session_round").on(table.sessionId, table.roundNumber),
	pgPolicy("Rounds cannot be deleted", { as: "permissive", for: "delete", to: ["public"], using: sql`false` }),
	pgPolicy("Can buzz in playing state", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Only functions create rounds", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Anyone can read rounds", { as: "permissive", for: "select", to: ["public"] }),
	check("positive_round_number", sql`round_number > 0`),
	check("valid_elapsed_seconds", sql`(elapsed_seconds IS NULL) OR ((elapsed_seconds >= (0)::numeric) AND (elapsed_seconds <= (30)::numeric))`),
	check("judged_rounds_have_points", sql`((correct IS NULL) AND (points_awarded IS NULL)) OR ((correct IS NOT NULL) AND (points_awarded IS NOT NULL))`),
]);

export const roundAnswers = pgTable("round_answers", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	roundId: uuid("round_id").notNull(),
	playerId: uuid("player_id").notNull(),
	submittedAnswer: text("submitted_answer").notNull(),
	autoValidated: boolean("auto_validated"),
	isCorrect: boolean("is_correct"),
	pointsAwarded: integer("points_awarded").default(0),
	submittedAt: timestamp("submitted_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_round_answers_player_id").using("btree", table.playerId.asc().nullsLast().op("uuid_ops")),
	index("idx_round_answers_round_id").using("btree", table.roundId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.roundId],
			foreignColumns: [gameRounds.id],
			name: "round_answers_round_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [players.id],
			name: "round_answers_player_id_fkey"
		}).onDelete("cascade"),
	unique("round_answers_round_id_player_id_key").on(table.roundId, table.playerId),
	pgPolicy("Answers can be updated", { as: "permissive", for: "update", to: ["public"], using: sql`true` }),
	pgPolicy("Players can submit answers", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Anyone can read answers", { as: "permissive", for: "select", to: ["public"] }),
]);

export const tracks = pgTable("tracks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	spotifyId: text("spotify_id").notNull(),
	title: text().notNull(),
	albumName: text("album_name"),
	releaseYear: integer("release_year"),
	spotifyPopularity: integer("spotify_popularity"),
	isrc: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	albumImageUrl: text("album_image_url"),
	popularityScore: numeric("popularity_score"),
}, (table) => [
	index("idx_tracks_has_image").using("btree", table.albumImageUrl.asc().nullsLast().op("text_ops")).where(sql`(album_image_url IS NOT NULL)`),
	index("idx_tracks_isrc").using("btree", table.isrc.asc().nullsLast().op("text_ops")),
	index("idx_tracks_popularity_score").using("btree", table.popularityScore.asc().nullsLast().op("numeric_ops")).where(sql`(popularity_score IS NOT NULL)`),
	index("idx_tracks_spotify_id").using("btree", table.spotifyId.asc().nullsLast().op("text_ops")),
	index("idx_tracks_spotify_popularity").using("btree", table.spotifyPopularity.desc().nullsFirst().op("int4_ops")),
	unique("tracks_spotify_id_unique").on(table.spotifyId),
	check("tracks_spotify_popularity_range", sql`(spotify_popularity >= 0) AND (spotify_popularity <= 100)`),
	check("tracks_popularity_score_range", sql`(popularity_score IS NULL) OR ((popularity_score >= (0)::numeric) AND (popularity_score <= (100)::numeric))`),
]);

export const packTracks = pgTable("pack_tracks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	packId: uuid("pack_id").notNull(),
	trackId: uuid("track_id").notNull(),
	position: integer(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_pack_tracks_pack_id").using("btree", table.packId.asc().nullsLast().op("uuid_ops")),
	index("idx_pack_tracks_position").using("btree", table.packId.asc().nullsLast().op("int4_ops"), table.position.asc().nullsLast().op("uuid_ops")),
	index("idx_pack_tracks_track_id").using("btree", table.trackId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.packId],
			foreignColumns: [packs.id],
			name: "pack_tracks_pack_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.trackId],
			foreignColumns: [tracks.id],
			name: "pack_tracks_track_id_fkey"
		}).onDelete("cascade"),
	unique("pack_tracks_pack_track_unique").on(table.packId, table.trackId),
]);

export const players = pgTable("players", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	sessionId: uuid("session_id"),
	name: text().notNull(),
	score: integer().default(0),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow(),
	isHost: boolean("is_host").default(false).notNull(),
	spotifyUserId: text("spotify_user_id"),
}, (table) => [
	index("idx_players_is_host").using("btree", table.sessionId.asc().nullsLast().op("uuid_ops"), table.isHost.asc().nullsLast().op("uuid_ops")).where(sql`(is_host = true)`),
	index("idx_players_session_id").using("btree", table.sessionId.asc().nullsLast().op("uuid_ops")),
	index("idx_players_spotify_user_id").using("btree", table.spotifyUserId.asc().nullsLast().op("text_ops")).where(sql`(spotify_user_id IS NOT NULL)`),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [gameSessions.id],
			name: "players_session_id_fkey"
		}).onDelete("cascade"),
	unique("players_session_id_name_key").on(table.sessionId, table.name),
	pgPolicy("Players can be removed", { as: "permissive", for: "delete", to: ["public"], using: sql`true` }),
	pgPolicy("Players can update self", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Can join lobby sessions", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Anyone can read players", { as: "permissive", for: "select", to: ["public"] }),
	check("reasonable_score", sql`(score >= '-1000'::integer) AND (score <= 10000)`),
]);

export const gameSessions = pgTable("game_sessions", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	hostName: text("host_name").notNull(),
	packId: uuid("pack_id"),
	currentRound: integer("current_round").default(0),
	state: text().default('lobby').notNull(),
	roundStartTime: timestamp("round_start_time", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	allowHostToPlay: boolean("allow_host_to_play").default(false).notNull(),
	totalRounds: integer("total_rounds").default(10).notNull(),
	enableTextInputMode: boolean("enable_text_input_mode").default(false).notNull(),
	difficulty: text().default('medium'),
}, (table) => [
	index("idx_game_sessions_difficulty").using("btree", table.difficulty.asc().nullsLast().op("text_ops")),
	index("idx_game_sessions_state").using("btree", table.state.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.packId],
			foreignColumns: [packs.id],
			name: "game_sessions_pack_id_fkey"
		}),
	pgPolicy("Can delete lobby or finished games", { as: "permissive", for: "delete", to: ["public"], using: sql`(state = ANY (ARRAY['lobby'::text, 'finished'::text]))` }),
	pgPolicy("Anyone can update game sessions", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Anyone can create game sessions", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Anyone can read game sessions", { as: "permissive", for: "select", to: ["public"] }),
	check("valid_total_rounds", sql`(total_rounds >= 1) AND (total_rounds <= 50)`),
	check("valid_current_round", sql`(current_round >= 0) AND (current_round <= 50)`),
	check("total_rounds_range", sql`(total_rounds >= 1) AND (total_rounds <= 50)`),
	check("difficulty_valid_values", sql`difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text, 'legendary'::text])`),
	check("valid_game_state", sql`state = ANY (ARRAY['lobby'::text, 'playing'::text, 'buzzed'::text, 'reveal'::text, 'submitted'::text, 'finished'::text])`),
]);

export const artists = pgTable("artists", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	spotifyArtistId: text("spotify_artist_id"),
	genres: text().array(),
	spotifyFollowers: integer("spotify_followers"),
	imageUrl: text("image_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_artists_genres").using("gin", table.genres.asc().nullsLast().op("array_ops")).where(sql`(genres IS NOT NULL)`),
	index("idx_artists_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("idx_artists_name_lower").using("btree", sql`lower(name)`),
	index("idx_artists_spotify_id").using("btree", table.spotifyArtistId.asc().nullsLast().op("text_ops")).where(sql`(spotify_artist_id IS NOT NULL)`),
	unique("artists_spotify_artist_id_key").on(table.spotifyArtistId),
]);

export const trackArtists = pgTable("track_artists", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	trackId: uuid("track_id").notNull(),
	artistId: uuid("artist_id").notNull(),
	position: integer().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_track_artists_artist_id").using("btree", table.artistId.asc().nullsLast().op("uuid_ops")),
	index("idx_track_artists_position").using("btree", table.trackId.asc().nullsLast().op("int4_ops"), table.position.asc().nullsLast().op("uuid_ops")),
	index("idx_track_artists_track_id").using("btree", table.trackId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.trackId],
			foreignColumns: [tracks.id],
			name: "track_artists_track_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.artistId],
			foreignColumns: [artists.id],
			name: "track_artists_artist_id_fkey"
		}).onDelete("cascade"),
	unique("track_artists_track_artist_unique").on(table.trackId, table.artistId),
	unique("track_artists_track_position_unique").on(table.trackId, table.position),
	check("track_artists_position_positive", sql`"position" > 0`),
]);
