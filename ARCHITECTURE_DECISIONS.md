# Architecture Decision Guide: Next.js 15 + Supabase + React Query

## Current State Analysis

**Your current architecture:**
- ✅ Supabase backend (PostgreSQL + Realtime)
- ✅ Next.js 15 App Router
- ✅ React Query for client state
- ❌ API Routes as middleman between client and Supabase
- ❌ Root layout is client component (QueryProvider at root)
- ❌ Mixed patterns: some direct Supabase calls, mostly API routes

**File structure:**
```
lib/supabase/
├── server.ts       # Server-side Supabase client (with cookies)
├── client.ts       # Browser-side Supabase client

app/api/            # 21 API route files
├── game/[id]/
│   ├── route.ts        # GET session
│   ├── buzz/route.ts   # POST buzz
│   ├── judge/route.ts  # POST judge
│   └── ...

hooks/
├── queries/        # React Query hooks (fetch via API routes)
├── mutations/      # React Query hooks (mutate via API routes)
```

---

## The Three Clear Architectural Options

### Option 1: Server Components First (Next.js Native)

**Philosophy:** Maximize server components, minimize client JavaScript, use React Query sparingly.

#### Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ (1) Initial page load
       ↓
┌─────────────────┐
│ Server Component│ ← Fetches directly from Supabase
│   (RSC)         │   on the server
└────────┬────────┘
         │
         │ (2) Streams HTML + data
         ↓
┌─────────────────┐
│ Client Component│ ← Only where needed:
│  (use client)   │   - Real-time updates
└────────┬────────┘   - Interactive forms
         │            - Mutations
         │
         │ (3) Real-time subscriptions
         ↓
┌─────────────────┐
│    Supabase     │
│   Realtime      │
└─────────────────┘
```

#### Code Example

```tsx
// app/host/[id]/page.tsx
// This is a SERVER COMPONENT (no "use client")
import { createClient } from '@/lib/supabase/server';

export default async function HostPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  // Fetch data on the server
  const { data: session } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('id', params.id)
    .single();

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('session_id', params.id);

  // Pass to client component for interactivity
  return <HostGameClient initialSession={session} initialPlayers={players} />;
}

// components/host/HostGameClient.tsx
'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function HostGameClient({ initialSession, initialPlayers }) {
  const [session, setSession] = useState(initialSession);
  const [players, setPlayers] = useState(initialPlayers);

  // Subscribe to real-time updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`game:${session.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_sessions',
        filter: `id=eq.${session.id}`
      }, (payload) => {
        setSession(payload.new);
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [session.id]);

  // Mutations go directly to Supabase
  const buzz = async () => {
    const supabase = createClient();
    await supabase.from('game_rounds').insert({...});
  };

  return <HostGameView session={session} players={players} onBuzz={buzz} />;
}
```

#### Pros ✅

1. **Maximum Performance**
   - Initial page load is instant (HTML rendered on server)
   - No client-side waterfall fetching
   - Smaller JavaScript bundle (no React Query overhead)

2. **SEO & Meta Tags**
   - Perfect for any public pages (leaderboards, game history)
   - Dynamic OG images for sharing game links

3. **Security**
   - Database queries run on server with RLS
   - No API routes needed (less attack surface)
   - Cookies/sessions handled server-side

4. **Simplicity**
   - One data source (Supabase)
   - No API route maintenance
   - Clear server/client boundary

5. **Type Safety**
   - Direct Supabase types from server to client
   - No API contract to maintain

#### Cons ❌

1. **Real-time Complexity**
   - Must manage state sync manually (useState + useEffect)
   - No automatic cache invalidation
   - Race conditions between server data and real-time updates

2. **Loading States**
   - Have to build your own loading/error boundaries
   - No built-in retry logic
   - Must handle optimistic updates manually

3. **Data Duplication**
   - Server fetches initial data, client subscribes to updates
   - Risk of stale initial data if not careful

4. **Limited Caching**
   - Each page navigation refetches (unless you build a cache)
   - No shared cache between routes

#### When to Use

- ✅ Game lobby (initial load matters)
- ✅ Pack selection page (SEO for packs)
- ✅ Final scoreboard (shareable links)
- ❌ Active gameplay (needs real-time + mutations)

---

### Option 2: React Query + API Routes (Traditional SPA)

**Philosophy:** Treat Next.js as a BFF (Backend for Frontend). All data flows through API routes.

#### Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ (1) Client-side fetch
       ↓
┌─────────────────┐
│ React Query     │ ← Manages all data fetching
│  (useQuery)     │   Loading, errors, cache
└────────┬────────┘
         │
         │ (2) fetch('/api/game/123')
         ↓
┌─────────────────┐
│  API Routes     │ ← Validates, transforms data
│ /app/api/...    │   Business logic layer
└────────┬────────┘
         │
         │ (3) Supabase query
         ↓
┌─────────────────┐
│    Supabase     │
│   Database      │
└─────────────────┘
```

#### Code Example

```tsx
// app/host/[id]/page.tsx
'use client';
import { useGameSession, useGamePlayers } from '@/hooks/queries/use-game';

export default function HostPage({ params }: { params: { id: string } }) {
  const { data: session, isLoading } = useGameSession(params.id);
  const { data: players } = useGamePlayers(params.id);
  const judgeMutation = useJudgeAnswer();

  if (isLoading) return <Skeleton />;

  return (
    <HostGameView
      session={session}
      players={players}
      onJudge={(correct) => judgeMutation.mutate({ sessionId: params.id, correct })}
    />
  );
}

// hooks/queries/use-game.ts
export function useGameSession(sessionId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['game_sessions', sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/game/${sessionId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  // Real-time invalidation
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`game:${sessionId}`)
      .on('postgres_changes', {...}, () => {
        queryClient.invalidateQueries(['game_sessions', sessionId]);
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [sessionId]);

  return query;
}

// app/api/game/[id]/route.ts
export async function GET(req, { params }) {
  const supabase = await createClient();

  // Validate, add business logic
  const { data: session } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('id', params.id)
    .single();

  // Could add computed fields, join data, etc.
  return NextResponse.json(session);
}
```

#### Pros ✅

1. **Developer Experience**
   - Automatic loading/error states
   - Built-in retry logic with exponential backoff
   - React Query DevTools for debugging
   - Less boilerplate than manual state management

2. **API as a Layer**
   - Validate inputs before touching database
   - Transform/shape data for frontend
   - Add rate limiting, logging, analytics
   - Business logic stays on server

3. **Caching & Performance**
   - Shared cache across components
   - Background refetching
   - Optimistic updates
   - Deduplicated requests

4. **Testing**
   - Mock API routes easily
   - Don't need Supabase for frontend tests
   - Clear API contract

5. **Real-time Integration**
   - Realtime events → query invalidation
   - React Query handles the refetch
   - Consistent UX

#### Cons ❌

1. **Double Network Hops**
   - Browser → Next.js API → Supabase
   - Added latency (especially on cold starts)
   - More infrastructure to maintain

2. **Type Safety Friction**
   - Database types → API response → Client
   - Must maintain API types separately
   - Risk of drift between layers

3. **Complexity**
   - 21 API route files to maintain
   - React Query config to manage
   - More moving parts to debug

4. **Client-Only**
   - Every page is "use client"
   - No SSR benefits (even where it would help)
   - Larger JavaScript bundle

5. **Over-Engineering**
   - For simple CRUD, API routes add ceremony
   - Supabase already has RLS (why validate twice?)
   - Not using Next.js 15's biggest feature (RSC)

#### When to Use

- ✅ Complex business logic (scoring algorithms)
- ✅ Multi-step mutations (game creation + pack selection)
- ✅ Need API versioning or third-party integrations
- ✅ Team prefers clear frontend/backend separation
- ❌ Simple database queries (over-engineering)

---

### Option 3: Hybrid (Server Components + Targeted React Query)

**Philosophy:** Use the right tool for each job. Server components by default, React Query for interactive features.

#### Architecture

```
┌─────────────────────────────────────────────────┐
│              App Router Layout                  │
│         (SERVER COMPONENT - no provider)        │
└─────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │                               │
        ↓                               ↓
┌──────────────┐              ┌──────────────────┐
│ Static Pages │              │  Game Routes     │
│ (Server RSC) │              │ (Client Hybrid)  │
│              │              │                  │
│ - Home       │              │ <QueryProvider>  │
│ - Pack List  │              │   wraps only     │
│ - About      │              │   game routes    │
└──────────────┘              └────────┬─────────┘
                                       │
                               ┌───────┴────────┐
                               │                │
                               ↓                ↓
                    ┌─────────────────┐  ┌────────────┐
                    │ useGameSession  │  │  Direct    │
                    │ (React Query)   │  │  Supabase  │
                    │                 │  │  (Client)  │
                    │ - Real-time     │  │            │
                    │ - Mutations     │  │ - Simple   │
                    │ - Cache         │  │   queries  │
                    └─────────────────┘  └────────────┘
```

#### Code Example

```tsx
// app/layout.tsx (SERVER COMPONENT)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children} {/* No QueryProvider here */}
      </body>
    </html>
  );
}

// app/(game)/layout.tsx (NEW - Client component for game routes only)
'use client';
import { QueryProvider } from '@/lib/query/provider';

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}

// app/(game)/host/[id]/page.tsx
'use client';
import { useGameSession } from '@/hooks/queries/use-game';

export default function HostPage({ params }: { params: { id: string } }) {
  // React Query for real-time game state
  const { data: session, isLoading } = useGameSession(params.id);

  if (isLoading) return <Skeleton />;
  return <HostGameView session={session} />;
}

// app/packs/page.tsx (SERVER COMPONENT)
import { createClient } from '@/lib/supabase/server';

export default async function PacksPage() {
  const supabase = await createClient();

  // Fetch on server (fast, SEO-friendly)
  const { data: packs } = await supabase
    .from('packs')
    .select('*, track_count:tracks(count)');

  return <PackGallery packs={packs} />;
}

// Decision tree for data fetching
function fetchData() {
  if (needsRealtime || hasMutations) {
    return 'React Query';
  } else if (isStaticOrSEO) {
    return 'Server Component';
  } else if (simpleClientFetch) {
    return 'Direct Supabase Client';
  }
}
```

#### Pros ✅

1. **Best of Both Worlds**
   - Fast initial loads (server components)
   - Reactive gameplay (React Query)
   - Small bundles where possible

2. **Right Tool, Right Job**
   - Static pages: Server Components (home, about)
   - Interactive pages: React Query (gameplay)
   - Simple forms: Direct Supabase (join game)

3. **Scalability**
   - Add server components without touching React Query
   - Add interactive features without refactoring server code

4. **Team-Friendly**
   - Clear patterns: "Game = React Query, Marketing = Server"
   - Each approach has clear use cases

#### Cons ❌

1. **Complexity**
   - Two data-fetching patterns to understand
   - More cognitive load ("which should I use?")
   - Risk of inconsistent patterns

2. **Route Grouping**
   - Must restructure routes into `(game)` and `(static)`
   - Migration work upfront

3. **Documentation Needed**
   - Team needs clear decision guide
   - New devs may not know which pattern to use

#### When to Use

- ✅ Apps with mixed needs (your case!)
- ✅ Want to use Next.js 15 properly
- ✅ Team is comfortable with both patterns
- ❌ Need one consistent pattern everywhere
- ❌ Very small team (cognitive overhead)

---

## Recommendation for Trackstar Game

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Document current architecture patterns", "status": "completed", "activeForm": "Documenting current architecture patterns"}, {"content": "Design three clear architectural options with pros/cons", "status": "completed", "activeForm": "Designing three clear architectural options with pros/cons"}, {"content": "Provide specific recommendations for this project", "status": "in_progress", "activeForm": "Providing specific recommendations for this project"}]