/**
 * NextAuth.js configuration for Spotify OAuth.
 *
 * Hosts must authenticate with Spotify to use the Web Playback SDK.
 * Players remain anonymous and don't need authentication.
 */

import NextAuth from 'next-auth';
import Spotify from 'next-auth/providers/spotify';

// Spotify scopes required for Web Playback SDK
const SPOTIFY_SCOPES = [
  'user-read-email',
  'user-read-private',
  'streaming', // Required for Web Playback SDK
  'user-read-playback-state',
  'user-modify-playback-state',
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    Spotify({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: SPOTIFY_SCOPES.join(' '),
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Persist the OAuth access_token and refresh_token to the token
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      session.accessToken = token.accessToken as string;
      session.error = token.error as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: '/', // Redirect to home page for sign in
    error: '/', // Redirect to home page on error
  },
});
