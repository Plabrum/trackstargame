# NextAuth v5 Spotify OAuth Debug Report

## Issue Summary
Unable to trigger Spotify OAuth sign-in flow. When clicking "Sign in with Spotify" button on landing page, getting consistent `TypeError: Invalid URL` error from NextAuth's `getAuthorizationUrl` function.

## Error Details

```
[auth][error] TypeError: Invalid URL
    at new URL (node:internal/url:826:25)
    at getAuthorizationUrl (webpack-internal:///(action-browser)/./node_modules/.pnpm/@auth+core@0.41.0/node_modules/@auth/core/lib/actions/signin/authorization-url.js:24:24)
    at Module.signIn (webpack-internal:///(action-browser)/./node_modules/.pnpm/@auth+core@0.41.0/node_modules/@auth/core/lib/actions/signin/index.js:16:136)
    at AuthInternal (webpack-internal:///(action-browser)/./node_modules/.pnpm/@auth+core@0.41.0/node_modules/@auth/core/lib/index.js:76:77)
    at async Auth (webpack-internal:///(action-browser)/./node_modules/.pnpm/@auth+core@0.41.0/node_modules/@auth/core/index.js:130:34)
    at async signIn (webpack-internal:///(action-browser)/./node_modules/.pnpm/next-auth@5.0.0-beta.30_next@15.5.6_react-dom@19.2.0_react@19.2.0__react@19.2.0__react@19.2.0/node_modules/next-auth/lib/actions.js:53:17)
    at async signInWithSpotify (webpack-internal:///(action-browser)/./app/actions/auth.ts:16:5)
```

## Environment

### Versions
- **Next.js**: 15.5.6
- **NextAuth**: 5.0.0-beta.30
- **@auth/core**: 0.41.0
- **Node.js**: (check with `node -v`)
- **React**: 19.2.0

### Environment Variables
Located in `.env.local`:

```bash
AUTH_SECRET=kdqhteCMA7Dt/yDyviPkRx/6ZOERdLw/zsXmGAaR0Zk=
AUTH_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
SPOTIFY_CLIENT_ID=<redacted>
SPOTIFY_CLIENT_SECRET=<redacted>
```

## Implementation Details

### 1. Auth Configuration (`lib/auth/config.ts`)

```typescript
import NextAuth from 'next-auth';
import Spotify from 'next-auth/providers/spotify';

const SPOTIFY_SCOPES = [
  'user-read-email',
  'user-read-private',
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state',
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  basePath: '/api/auth',
  secret: process.env.AUTH_SECRET,
  trustHost: true,
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
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.error = token.error as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
});
```

### 2. Auth API Route (`app/api/auth/[...nextauth]/route.ts`)

```typescript
import { handlers } from '@/lib/auth/config';

export const { GET, POST } = handlers;
```

### 3. Server Action (`app/actions/auth.ts`)

```typescript
'use server';

import { signIn } from '@/lib/auth/config';

export async function signInWithSpotify() {
  await signIn('spotify', {
    redirectTo: '/host/select-pack',
  });
}
```

### 4. Client Component (`app/page.tsx`)

```typescript
"use client";

import { signInWithSpotify } from "./actions/auth";

export default function Home() {
  const handleHostGame = async () => {
    await signInWithSpotify();
  };

  return (
    <Button onClick={handleHostGame}>
      Sign in with Spotify
    </Button>
  );
}
```

### 5. Middleware (`middleware.ts`)

```typescript
import { auth } from '@/lib/auth/config';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  if (pathname.startsWith('/host/select-pack') && !isAuthenticated) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
```

## Troubleshooting Steps Attempted

1. ✅ Verified environment variables are set (`AUTH_SECRET`, `AUTH_URL`, `NEXTAUTH_URL`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`)
2. ✅ Added `trustHost: true` to NextAuth config
3. ✅ Added explicit `basePath: '/api/auth'` to NextAuth config
4. ✅ Added both `AUTH_URL` and `NEXTAUTH_URL` environment variables
5. ✅ Created server action to call `signIn()` from server context
6. ✅ Updated middleware to run on all pages (not just `/host/*`)
7. ✅ Restarted dev server multiple times after each change
8. ✅ Verified API route handler is properly exported

## Things to Check

### 1. URL Construction Issue
The error occurs in `getAuthorizationUrl` when trying to construct a URL. This suggests NextAuth v5 cannot determine the base URL even with:
- Environment variables set
- `trustHost: true` enabled
- `basePath` explicitly defined
- Middleware running on all routes

### 2. NextAuth v5 Beta Known Issues
- NextAuth v5 is still in beta (v5.0.0-beta.30)
- May have breaking changes or incomplete documentation
- Server actions with `signIn()` might not have proper request context

### 3. Spotify Provider Configuration
Spotify Developer Dashboard should have:
- Redirect URI: `http://localhost:3000/api/auth/callback/spotify`
- App credentials match environment variables

## Potential Solutions to Try

### Option 1: Use Direct Redirect Instead of Server Action

```typescript
// app/page.tsx
const handleHostGame = () => {
  // Direct browser redirect to NextAuth endpoint
  window.location.href = '/api/auth/signin/spotify?callbackUrl=/host/select-pack';
};
```

### Option 2: Add Explicit Base URL to Config

```typescript
// lib/auth/config.ts
export const { handlers, signIn, signOut, auth } = NextAuth({
  // ... existing config
  experimental: {
    basePath: '/api/auth',
  },
  url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
});
```

### Option 3: Downgrade to NextAuth v4

NextAuth v4 is stable and well-documented. Consider downgrading if v5 beta continues to have issues:

```bash
pnpm remove next-auth
pnpm add next-auth@^4.24.7
```

### Option 4: Use Form Action Instead of onClick

```typescript
// app/page.tsx
<form action={signInWithSpotify}>
  <Button type="submit">
    Sign in with Spotify
  </Button>
</form>
```

### Option 5: Check if Request Headers Available

```typescript
// app/actions/auth.ts
'use server';

import { signIn } from '@/lib/auth/config';
import { headers } from 'next/headers';

export async function signInWithSpotify() {
  const headersList = await headers();
  console.log('Available headers:', Object.fromEntries(headersList.entries()));

  await signIn('spotify', {
    redirectTo: '/host/select-pack',
  });
}
```

## Questions for Next Session

1. Is NextAuth v5 beta the right choice, or should we use stable v4?
2. Can we see the actual request headers when the server action is called?
3. Should we try a different authentication approach (e.g., manual OAuth flow)?
4. Are there any NextAuth v5 + Next.js 15 App Router compatibility issues?

## Files to Review

- `lib/auth/config.ts` - Main auth configuration
- `app/api/auth/[...nextauth]/route.ts` - Auth API handler
- `app/actions/auth.ts` - Server action for sign-in
- `app/page.tsx` - Landing page with sign-in button
- `middleware.ts` - Auth middleware
- `.env.local` - Environment variables
- `package.json` - Check exact versions

## Expected Behavior

When clicking "Sign in with Spotify" button:
1. Server action `signInWithSpotify()` should be called
2. NextAuth's `signIn('spotify', {...})` should construct authorization URL
3. Browser should redirect to Spotify OAuth consent page
4. After user approves, redirect back to `/host/select-pack`

## Actual Behavior

Server action is called but NextAuth throws `TypeError: Invalid URL` when trying to construct the authorization URL, suggesting it cannot determine the base URL from environment variables or request context.

---

**Generated:** 2025-01-14
**Status:** Unresolved
**Priority:** High (blocking Spotify authentication flow)
