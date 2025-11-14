/**
 * NextAuth.js middleware to protect host routes.
 *
 * Requires authentication for /host/* pages.
 * Players accessing /play/* don't need authentication.
 */

export { auth as middleware } from '@/lib/auth/config';

export const config = {
  matcher: ['/host/:path*'],
};
