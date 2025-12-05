import { relations } from "drizzle-orm/relations";
import { packs, gameSessions, players, gameRounds, roundAnswers, packTracks, tracks, artists, trackArtists } from "./schema";

export const gameSessionsRelations = relations(gameSessions, ({one, many}) => ({
	pack: one(packs, {
		fields: [gameSessions.packId],
		references: [packs.id]
	}),
	players: many(players),
	gameRounds: many(gameRounds),
}));

export const packsRelations = relations(packs, ({many}) => ({
	gameSessions: many(gameSessions),
	packTracks: many(packTracks),
}));

export const playersRelations = relations(players, ({one, many}) => ({
	gameSession: one(gameSessions, {
		fields: [players.sessionId],
		references: [gameSessions.id]
	}),
	gameRounds: many(gameRounds),
	roundAnswers: many(roundAnswers),
}));

export const gameRoundsRelations = relations(gameRounds, ({one, many}) => ({
	player: one(players, {
		fields: [gameRounds.buzzerPlayerId],
		references: [players.id]
	}),
	gameSession: one(gameSessions, {
		fields: [gameRounds.sessionId],
		references: [gameSessions.id]
	}),
	roundAnswers: many(roundAnswers),
}));

export const roundAnswersRelations = relations(roundAnswers, ({one}) => ({
	player: one(players, {
		fields: [roundAnswers.playerId],
		references: [players.id]
	}),
	gameRound: one(gameRounds, {
		fields: [roundAnswers.roundId],
		references: [gameRounds.id]
	}),
}));

export const packTracksRelations = relations(packTracks, ({one}) => ({
	pack: one(packs, {
		fields: [packTracks.packId],
		references: [packs.id]
	}),
	track: one(tracks, {
		fields: [packTracks.trackId],
		references: [tracks.id]
	}),
}));

export const tracksRelations = relations(tracks, ({many}) => ({
	packTracks: many(packTracks),
	trackArtists: many(trackArtists),
}));

export const trackArtistsRelations = relations(trackArtists, ({one}) => ({
	artist: one(artists, {
		fields: [trackArtists.artistId],
		references: [artists.id]
	}),
	track: one(tracks, {
		fields: [trackArtists.trackId],
		references: [tracks.id]
	}),
}));

export const artistsRelations = relations(artists, ({many}) => ({
	trackArtists: many(trackArtists),
}));