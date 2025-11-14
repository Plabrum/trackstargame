/**
 * NextAuth.js v4 middleware to protect host routes.
 *
 * Requires authentication for /host/* pages.
 * Players accessing /play/* don't need authentication.
 */

import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const { pathname } = req.nextUrl;

      // Protect /host/* routes
      if (pathname.startsWith('/host')) {
        return !!token;
      }

      // Allow all other routes
      return true;
    },
  },
  pages: {
    signIn: '/',
  },
});

export const config = {
  matcher: ['/host/:path*'],
};
