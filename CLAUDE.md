# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Trackstar Game is a multiplayer music guessing game built with Next.js 15, Supabase, and Spotify's Web Playback SDK. Players compete to identify songs from curated packs, with features for both party multiplayer and solo play modes.

## Core Technologies

- **Next.js 15** with App Router (React 19)
- **Supabase** for database, auth, and real-time features
- **Spotify Web Playback SDK** for music playback
- **React Query** (@tanstack/react-query) for client state
- **Radix UI** + **Tailwind CSS** for UI components
- **TypeScript** with strict typing
- **Vitest** for testing

## Development Commands

### Essential Commands
```bash
# Start local development
pnpm dev                    # Next.js dev server on localhost:3000
pnpm supabase:start        # Start local Supabase (Docker required)
pnpm supabase:status       # Get connection details for local Supabase

# Build and validation
pnpm build                 # Production build
pnpm type-check            # TypeScript type checking
pnpm lint                  # ESLint

# Testing
pnpm test                  # Run tests with Vitest
pnpm test:ui              # Run tests with UI

# Database
pnpm supabase:reset        # Reset local DB and reapply all migrations
pnpm db:generate-types     # Generate TypeScript types from local DB schema
npx supabase migration new <name>  # Create new migration file
```

### Supabase Management
```bash
pnpm supabase:stop         # Stop local Supabase
pnpm supabase:restart      # Restart local Supabase
```

**Important:** The local Supabase runs on custom ports:
- Database: `localhost:54322`
- API: `localhost:54321`
- Studio: `http://127.0.0.1:54323`

## Architecture

### Data Fetching Strategy (Hybrid)

The codebase uses a **hybrid architecture** as documented in `ARCHITECTURE_DECISIONS.md`:

1. **Server Components**: Used for initial page loads where SEO or performance matters
2. **React Query + Real-time**: Used for interactive game features that need mutations and real-time updates
3. **Direct Supabase Client**: Used for simple client-side queries

**Route Structure:**
- `/app/(game)/` - Game routes use QueryProvider for React Query
- `/app/host/` - Host routes (lobby creation, pack selection)
- `/app/` - Landing and static pages

**Key Pattern:** Server components fetch initial data, then pass it to client components that subscribe to real-time updates via Supabase Realtime.

### Game State Machine

The game logic is centralized in `lib/game/state-machine.ts`, which defines:
- **States**: `lobby`, `playing`, `buzzed`, `submitted`, `reveal`, `finished`
- **Roles**: `host`, `player`
- **Actions**: State-based actions available to each role
- **Validation**: Answer validation with fuzzy matching

This state machine pattern ensures consistent game flow and prevents invalid state transitions.

### Spotify Authentication

Spotify auth uses a custom cookie-based flow:
- **Middleware** (`middleware.ts`): Automatically refreshes expired tokens before protected routes
- **Context** (`lib/spotify-auth-context.tsx`): Provides `user`, `accessToken`, and `logout` to authenticated components
- **Protected Routes**: `/host/*` routes require Spotify authentication
- **Player Routes**: `/play/*` routes do NOT require Spotify auth (players join by name only)

**Important:** Only the host needs Spotify Premium for playback. Players don't need Spotify accounts.

### Database Schema

Key tables:
- `game_sessions` - Game instances with settings and state
- `players` - Player identities and scores
- `packs` - Song pack collections
- `tracks` - Individual songs in packs
- `game_rounds` - Round-by-round game progression
- `round_answers` - Player answers for text input mode

**RLS Policies:** Supabase Row Level Security is enabled. See `supabase/migrations/20251118000001_enable_rls_policies.sql`.

### Real-time Updates

The app uses Supabase Realtime for live game updates:
- **Host**: Subscribes to `game_sessions`, `players`, `game_rounds` changes
- **Players**: Subscribe to session state and round updates
- **Pattern**: React Query + Realtime subscriptions trigger cache invalidations

See `hooks/useHostGame.ts` and `components/game/PlayerGameView.tsx` for examples.

## Project Structure

```
app/
├── (game)/              # Game routes with QueryProvider
│   ├── host/[id]/      # Host game controller
│   └── play/[id]/      # Player game view
├── host/               # Host lobby and pack selection
├── api/                # API routes for Spotify OAuth
└── page.tsx            # Landing page

components/
├── game/               # Game UI (player views, scoring, timers)
├── host/               # Host UI (lobby, settings, playback controls)
├── shared/             # Shared components
└── ui/                 # Radix UI primitives

lib/
├── game/               # Game state machine and logic
│   ├── state-machine.ts        # Core game state machine
│   ├── answer-validation.ts    # Answer fuzzy matching
│   └── fuzzy-match.ts         # Fuzzy string matching algorithm
├── supabase/           # Supabase clients
│   ├── client.ts       # Browser Supabase client
│   └── server.ts       # Server-side Supabase client
├── spotify-auth.ts     # Spotify OAuth utilities
└── types/
    └── database.ts     # Generated from Supabase schema

hooks/
├── queries/            # React Query hooks for data fetching
├── mutations/          # React Query hooks for mutations
├── useHostGame.ts      # Host game state and actions
├── useSpotifyPlayer.ts # Spotify Web Playback SDK integration
└── useGameExecutor.ts  # Game action executor with state machine

supabase/
├── config.toml         # Local Supabase configuration
└── migrations/         # Database migrations (timestamped SQL files)
```

## Key Patterns and Conventions

### Type Generation

After any database schema changes:
```bash
pnpm db:generate-types
```

This updates `lib/types/database.ts`. **Always run this after creating/modifying migrations.**

### Migration Workflow

1. **Create migration**: `npx supabase migration new <descriptive_name>`
2. **Write SQL**: Edit the generated file in `supabase/migrations/`
3. **Apply locally**: `npx supabase db push` to apply just the new migration
4. **Generate types**: `pnpm db:generate-types`
5. **Commit**: Migrations are auto-deployed to production on push to `main`

**IMPORTANT:** Use `npx supabase db push` (NOT `pnpm supabase:reset`) to test new migrations locally. The `reset` command wipes all local data including song packs, which takes a long time to repopulate. Only use `reset` when you absolutely need to start fresh or are troubleshooting migration ordering issues.

See `docs/DEPLOYMENT.md` for automated deployment details.

### Component Organization

- **Server Components**: Default in `app/` routes (no `'use client'`)
- **Client Components**: Mark with `'use client'` for interactivity
- **Game Logic**: Keep in `lib/game/` - UI components call the state machine
- **Hooks**: Custom hooks in `hooks/` for reusable logic

### Spotify Playback

The host uses Spotify Web Playback SDK (see `hooks/useSpotifyPlayer.ts`):
- **Device**: Creates a hidden browser-based playback device
- **Controls**: Play/pause tracks from packs
- **Track Progress**: Monitors elapsed time for game timing

**Important:** Requires Spotify Premium for the host account.

### Real-time Subscriptions

Pattern for real-time with React Query:
```typescript
useEffect(() => {
  const channel = supabase
    .channel(`game:${sessionId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'game_sessions',
      filter: `id=eq.${sessionId}`
    }, () => {
      queryClient.invalidateQueries(['game_sessions', sessionId]);
    })
    .subscribe();

  return () => { channel.unsubscribe(); };
}, [sessionId]);
```

## Common Development Tasks

### Adding a New Game Feature

1. **Update state machine** if adding new states/actions (`lib/game/state-machine.ts`)
2. **Create migration** for any schema changes
3. **Apply migration** with `npx supabase db push` (preserves local data)
4. **Update types** with `pnpm db:generate-types`
5. **Add hooks** for data fetching/mutations (`hooks/`)
6. **Build UI components** (`components/game/` or `components/host/`)
7. **Test locally** with `pnpm dev`

### Adding a New Music Pack

Packs are currently seeded via migrations. To add new packs:
1. Create migration with pack metadata
2. Add tracks with Spotify track IDs
3. Consider creating a Python script in `scripts/` for bulk imports

### Debugging Real-time Issues

- Check Supabase Studio: `http://127.0.0.1:54323`
- Enable realtime logging in browser DevTools
- Verify RLS policies aren't blocking subscriptions
- Check network tab for websocket connections

## Environment Variables

Required for local development (`.env.local`):
```env
# Spotify OAuth (from developer.spotify.com)
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback

# Supabase (auto-configured for local development)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<get from supabase:status>
```

See `.env.local.example` for full configuration.

## Testing

The project uses Vitest for testing. Key test files:
- `lib/game/state-machine.test.ts` - State machine logic tests

Run tests during development:
```bash
pnpm test:ui  # Opens Vitest UI for interactive testing
```

## Deployment

- **Platform**: Vercel (Next.js) + Supabase (database)
- **CI/CD**: GitHub Actions
  - `.github/workflows/ci.yml` - Type check, lint, build on all PRs
  - `.github/workflows/deploy-migrations.yml` - Auto-deploy migrations to production on `main`

**Production Deployment:**
1. Push to `main` branch
2. CI runs type checks and build
3. If migrations changed, they're automatically applied to production
4. Updated types are committed back to repo

See `docs/DEPLOYMENT.md` for GitHub Secrets setup and troubleshooting.

## Important Gotchas

1. **DON'T reset local DB unnecessarily** - Use `npx supabase db push` to apply new migrations. Avoid `pnpm supabase:reset` because it wipes all local song data which takes forever to repopulate. Only reset when absolutely necessary (migration ordering issues, starting fresh).
2. **Always generate types after schema changes** - `pnpm db:generate-types`
3. **Test migrations locally first** - Use `npx supabase db push` to apply new migrations before pushing to production
4. **Host vs Player auth** - Only host routes require Spotify auth
5. **State machine is source of truth** - Don't bypass it for game logic
6. **RLS policies** - All tables have RLS enabled; consider this when debugging queries
7. **Local Supabase ports** - Different from default Supabase ports (54321 vs 54320)
8. **Realtime subscriptions** - Remember to unsubscribe in cleanup functions
9. **Spotify token refresh** - Middleware handles this automatically for `/host/*` routes

## Additional Documentation

- `ARCHITECTURE_DECISIONS.md` - Deep dive into the hybrid architecture and why it was chosen
- `docs/DEPLOYMENT.md` - Complete deployment and CI/CD setup guide
- `README.md` - Setup instructions and getting started guide
