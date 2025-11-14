/**
 * NextAuth.js API route handler.
 *
 * Handles all authentication routes:
 * - /api/auth/signin
 * - /api/auth/signout
 * - /api/auth/callback/spotify
 * - /api/auth/session
 */

import { handlers } from '@/lib/auth/config';

export const { GET, POST } = handlers;
