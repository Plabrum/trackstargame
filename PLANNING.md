# 🎮 Trackstar Music Guessing Game - Project Planning Document

## Executive Summary
Trackstar is a multiplayer music guessing game (2-10 players) with buzz-in mechanics and a host controller. Players compete to identify songs across 10 rounds with real-time synchronization and speed-based scoring. Points are awarded based on buzz speed (30 - elapsed_seconds), with -10 point penalty for wrong answers. This document outlines the MVP implementation and future enhancement roadmap.

---

## 🎯 MVP Scope (Current Phase)

### Core Features
- **Game Format**: 10-round buzz-in competition with 2-10 players
- **Host Role**: One user controls game flow and audio playback
- **Host Authentication**: Spotify OAuth (Premium account required for full track playback)
- **Player Authentication**: Anonymous sessions (display name only)
- **Audio Delivery**: Spotify Web Playback SDK (host's device plays audio, in-person gameplay)
- **Track Management**: Python scripts for populating database (scraping Trackstar videos, storing Spotify IDs)
- **Scoring**: Speed-based system (30 - elapsed_seconds for correct, -10 for wrong)
- **Sync**: Real-time game state via Supabase Realtime
- **UI Components**: Shadcn UI component library
- **CI/CD**: Automated deployment pipeline

### Target Users
- Friends/family playing in the same room
- Casual game nights
- Music trivia enthusiasts

### Key Technical Decisions (MVP)
1. **Host Spotify OAuth required** - Hosts must authenticate with Spotify (free or premium account)
2. **No player accounts** - Zero friction for players to join (anonymous sessions)
3. **Spotify Web Playback SDK** - Full track playback via host's Spotify account (not just 30s previews)
4. **Single device audio** - Host's device plays audio, simpler implementation for in-person gameplay
5. **Python scripts for content** - Scrape Trackstar videos, populate database with Spotify track IDs
6. **Shadcn UI** - Pre-built accessible components for rapid development
7. **TanStack Query** - Better than useEffect for data fetching; automatic caching, real-time updates, and loading states
8. **Speed-based scoring** - Reward fast recognition, penalize wrong answers
9. **CI/CD from start** - Automated testing and deployment

---

## 📐 Technical Architecture (MVP)

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Shadcn UI
- **State Management**: TanStack Query (React Query) for server state, caching, and real-time sync
- **Backend**: Next.js API Routes, Supabase (PostgreSQL + Realtime)
- **Hosting**: Vercel (Frontend), Supabase (Database)
- **Audio**: Spotify Web Playback SDK (requires host Spotify OAuth)
- **Authentication**: Spotify OAuth for hosts (NextAuth.js)
- **Data Population**: Python scripts (UV) for scraping YouTube and populating database with Spotify track IDs
- **CI/CD**: GitHub Actions with Vercel integration

### Database Schema

```sql
-- Packs: Themed collections of tracks
CREATE TABLE packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tracks: Individual songs with Spotify IDs
CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_id UUID REFERENCES packs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  spotify_id TEXT NOT NULL, -- Spotify track ID for Web Playback SDK
  created_at TIMESTAMP DEFAULT NOW()
);

-- Game Sessions: Active/completed games
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_name TEXT NOT NULL, -- Host who controls the game
  pack_id UUID REFERENCES packs(id),
  current_round INT DEFAULT 0,
  state TEXT DEFAULT 'lobby', -- lobby, playing, buzzed, reveal, score, finished
  round_start_time TIMESTAMP, -- when current round's audio started playing
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Players: Participants in a game session (2-10 players)
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score INT DEFAULT 0,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, name) -- prevent duplicate names in same game
);

-- Game Rounds: Track history for each round
CREATE TABLE game_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  track_id UUID REFERENCES tracks(id),
  buzzer_player_id UUID REFERENCES players(id), -- who buzzed first
  buzz_time TIMESTAMP, -- when they buzzed
  elapsed_seconds DECIMAL(5,2), -- time from round start to buzz
  correct BOOLEAN, -- did they get it right?
  points_awarded INT, -- (30 - elapsed_seconds) or -10
  created_at TIMESTAMP DEFAULT NOW()
);
```

### State Machine

```
Lobby → Playing → Buzzed → Reveal → [Next Round or Finish]
  ↓                                         ↑
  └─────────────────────────────────────────┘
```

**States:**
- `lobby`: Waiting for players to join (minimum 2, maximum 10)
- `playing`: Audio playing on host device, buzz buttons active for all players
- `buzzed`: Someone buzzed (audio stops), waiting for host to mark correct/incorrect
- `reveal`: Track info shown, points awarded/deducted, leaderboard updated
- `finished`: All 10 rounds complete, final scores displayed

**Scoring Rules:**
- Correct buzz: `points = 30 - elapsed_seconds` (buzzed at 3.5s = 26.5 points)
- Incorrect buzz: `points = -10`
- No buzz: `points = 0`

### Realtime Events

Channel: `game:{sessionId}`

| Event | Payload | Trigger |
|-------|---------|---------|
| `player_joined` | `{ playerId, playerName }` | Player joins lobby |
| `player_left` | `{ playerId, playerName }` | Player disconnects |
| `round_start` | `{ roundNumber, trackId }` | Host starts round, audio begins |
| `buzz` | `{ playerId, playerName, elapsedSeconds }` | Player hits buzz button |
| `round_result` | `{ playerId, correct, pointsAwarded }` | Host marks answer correct/incorrect |
| `reveal` | `{ track: { title, artist }, leaderboard }` | Track revealed with updated scores |
| `state_change` | `{ newState }` | State transition |
| `game_end` | `{ leaderboard, winner }` | Final round completed |

---

## 🚀 MVP Implementation Plan

### Phase 1: Project Setup (Day 1, Morning) ✅ COMPLETED
**Goal**: Bootstrapped project with database, UI components, and CI/CD

1. Initialize Next.js 15 with TypeScript, App Router, Tailwind
2. Set up Shadcn UI (`npx shadcn@latest init`)
3. Install required Shadcn components (Button, Card, Input, Badge, etc.)
4. Set up Supabase project and install dependencies
5. Create database tables and generate TypeScript types
6. Configure environment variables (.env.local)
7. Set up GitHub Actions for CI/CD:
   - Run tests on PR
   - Type checking
   - Lint
   - Auto-deploy to Vercel on merge to main
8. Set up basic project structure:
   ```
   /app
     /api
       /session
       /game
     /host/[id]
     /play/[id]
   /components
     /ui (Shadcn components)
     /game
     /host
   /lib
     /supabase
     /game-state
     /types
     /query (TanStack Query setup)
   /hooks
     /queries (TanStack Query hooks for data fetching)
     /mutations (TanStack Query hooks for mutations)
   /scripts (Python scripts for DB population)
   ```

#### Phase 1 Completion Report (November 14, 2025)

**Status**: ✅ Successfully Completed

**Deliverables**:
- ✅ Next.js 15.5.6 with TypeScript, App Router, and Tailwind CSS
- ✅ Shadcn UI configured with 6 components (Button, Card, Input, Badge, Skeleton, Toast)
- ✅ Supabase database with complete schema:
  - 5 tables: packs, tracks, game_sessions, players, game_rounds
  - Indexes for performance optimization
  - Auto-updating timestamp triggers
  - All foreign key relationships established
- ✅ TypeScript types generated from Supabase schema
- ✅ Supabase client utilities (browser and server)
- ✅ Health check API endpoint (`/api/health`)
- ✅ GitHub Actions CI/CD pipeline configured
- ✅ Deployed to Vercel with custom domain: https://www.trackstargame.com/
- ✅ All environment variables configured in Vercel

**Project Structure Created**:
```
trackstargame/
├── .github/workflows/ci.yml       # CI/CD pipeline
├── app/
│   ├── api/health/route.ts        # Supabase connection test
│   ├── host/[id]/page.tsx         # Placeholder host view
│   ├── play/[id]/page.tsx         # Placeholder player view
│   ├── layout.tsx                 # Root layout with fonts
│   ├── page.tsx                   # Home page with health check UI
│   └── globals.css                # Tailwind + Shadcn styles
├── components/
│   ├── ui/                        # Shadcn components
│   ├── game/.gitkeep             # Ready for Phase 2+
│   └── host/.gitkeep             # Ready for Phase 2+
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   └── server.ts             # Server Supabase client
│   ├── types/
│   │   └── database.ts           # Generated TypeScript types
│   └── utils.ts                  # cn() utility for Shadcn
├── hooks/                        # Ready for Phase 2+
├── supabase/
│   └── migrations/
│       └── 20250114000000_initial_schema.sql
├── package.json                  # pnpm configuration
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

**Technical Validation**:
- ✅ TypeScript compilation: No errors
- ✅ ESLint checks: Passing
- ✅ Production build: Successful
- ✅ Supabase connection: Verified (0 packs in database)
- ✅ Health check endpoint: 200 OK response
- ✅ GitHub Actions: Pipeline configured and ready
- ✅ Vercel deployment: Live and accessible

**Issues Encountered & Resolved**:
1. **Missing dependencies**: Added `@radix-ui/react-icons`, `autoprefixer`, `tailwindcss-animate`
2. **Next.js 15 async params**: Updated dynamic routes to use `Promise<{ id: string }>`
3. **Vercel environment variable formatting**: Supabase anon key had newline characters breaking HTTP headers - resolved by ensuring single-line format

**Deployment URL**: https://www.trackstargame.com/

**Vercel Preview URL**: https://trackstargame.vercel.app/

**Repository**: https://github.com/Plabrum/trackstargame

**Time to Complete**: ~2 hours (including troubleshooting)

**Ready for Phase 2**: Database is ready, infrastructure is solid, all tooling configured. Next steps: Python scripts for data population.

---

### Phase 2: Python Scripts & Data Population (Day 1, Afternoon)
**Goal**: Scripts to scrape and populate database with Trackstar content

6. Create Python environment setup:
   - `scripts/pyproject.toml` - UV dependencies (requests, beautifulsoup4, psycopg2, spotipy)
   - `scripts/.env.example` - Template for database connection
7. Implement scraping scripts:
   - `scripts/utils/youtube.py` - Extract YouTube video descriptions
   - `scripts/utils/parser.py` - Parse track lists from descriptions
   - Handle rate limiting and error cases
8. Implement Spotify integration:
   - `scripts/utils/spotify.py` - Spotify API wrapper for track search
   - Get track metadata (title, artist, preview URL)
9. Implement database population scripts:
   - `scripts/create_pack_from_youtube.py` - End-to-end pack creation
   - `scripts/list_packs.py` - View all packs in database
   - `scripts/utils/db.py` - Shared database connection utilities
10. Create README documentation:
   - `scripts/README.md` - Setup and usage instructions
   - How to run each script
   - Data format expectations

#### Phase 2 Completion Report (November 14, 2025)

**Status**: ✅ Scripts Complete - ⚠️ Spotify Preview URL Limitation Discovered

**Deliverables**:
- ✅ UV-based Python environment with pyproject.toml
- ✅ YouTube description scraper (tested with Anderson .Paak episode)
- ✅ Track list parser (successfully extracted 12 tracks)
- ✅ Spotify API integration with spotipy
- ✅ Database population utilities
- ✅ End-to-end pack creation script
- ✅ Comprehensive scripts/README.md documentation

**Scripts Created**:
```
scripts/
├── pyproject.toml                     # UV dependencies
├── .env.example                       # Environment template
├── .env                               # Local credentials (git-ignored)
├── create_pack_from_youtube.py        # Main pack creation script
├── list_packs.py                      # List all packs
├── test_scraping.py                   # Test YouTube scraping
├── test_spotify.py                    # Test Spotify API
├── debug_spotify.py                   # Debug Spotify responses
├── README.md                          # Full documentation
└── utils/
    ├── __init__.py
    ├── youtube.py                     # YouTube scraping
    ├── parser.py                      # Track list parsing
    ├── spotify.py                     # Spotify API wrapper
    └── db.py                          # Database utilities
```

**Testing Results**:
- ✅ YouTube scraping: Successfully extracted Anderson .Paak episode description (1,292 chars)
- ✅ Track parsing: Correctly identified all 12 tracks in format "Title - Artist"
- ✅ Database connection: Validated with Supabase PostgreSQL
- ⚠️ Spotify preview URLs: **NONE AVAILABLE** for tested tracks

**Critical Issue Discovered - Spotify Preview URLs**:

During testing, we discovered that Spotify API is **not providing preview URLs** (`preview_url: null`) for tracks, including very popular songs like:
- "Blinding Lights" by The Weeknd
- "Shape of You" by Ed Sheeran
- All 12 tracks from Anderson .Paak episode

**Why This Happens**:
1. Preview URLs are not guaranteed by Spotify for all tracks
2. May be region/market restricted
3. Often missing for popular tracks or certain label agreements
4. This is a known Spotify API limitation, not a bug in our code

**Impact on MVP**:
- Cannot use Spotify preview URLs as originally planned
- Need alternative audio source strategy

**Architecture Decision**:

After discovering this limitation, we made a **critical architectural decision**:

✅ **ADOPTED: Spotify Web Playback SDK**
- Database schema updated to store `spotify_id` instead of `preview_url`
- Host Spotify OAuth is now an **MVP requirement** (no longer Phase 2.5)
- Hosts must authenticate with Spotify (free or premium account)
- Can play full tracks, not just 30s previews
- Better user experience overall
- Migration applied: `20250114000001_update_tracks_spotify_id.sql`

**Database Changes**:
```sql
-- Column renamed from preview_url to spotify_id
ALTER TABLE tracks RENAME COLUMN preview_url TO spotify_id;
CREATE INDEX idx_tracks_spotify_id ON tracks(spotify_id);
```

**Script Updates**:
- ✅ `utils/spotify.py` - Returns `spotify_id` instead of checking for `preview_url`
- ✅ `utils/db.py` - Stores `spotify_id` in database
- ✅ `create_pack_from_youtube.py` - Updated messaging

**Impact on Roadmap**:
- Phase 2.5 (Spotify OAuth) is now part of MVP Phase 3
- Players remain anonymous (no authentication required)
- Only hosts need to authenticate with Spotify

**Time to Complete**: ~3 hours (including troubleshooting and architecture pivot)

**Ready for Phase 3**: Implement Spotify OAuth for hosts and Web Playback SDK integration

---

### Phase 3: Game State & API (Day 1, Evening)
**Goal**: Server-side game logic working

10. Implement state machine (`lib/game-state.ts`):
    - State enum and transition validators (lobby → playing → buzzed → reveal → finished)
    - Buzz winner logic (atomic first-buzz-wins)
    - Score calculation: `30 - elapsed_seconds` (correct) or `-10` (incorrect)
    - Player limit validation (2-10 players)
11. Create session API routes:
    - `POST /api/session/create` - Host creates session, selects pack, returns session ID
    - `POST /api/session/[id]/join` - Player joins with name, returns player ID
    - `GET /api/session/[id]` - Get current session state, players, scores
    - `POST /api/session/[id]/start` - Host starts game (min 2 players required)
12. Create game API routes:
    - `POST /api/game/[id]/start-round` - Host starts round, select random unused track, record start time
    - `POST /api/game/[id]/buzz` - Player buzzes, record timestamp, calculate elapsed time
    - `POST /api/game/[id]/judge` - Host marks answer correct/incorrect, award points
    - `POST /api/game/[id]/next-round` - Advance to next round or finish game

### Phase 4: Realtime Integration (Day 2, Morning)
**Goal**: All players and host see synchronized state

13. Set up Supabase Realtime client (`lib/supabase/realtime.ts`):
    - Helper to create game channel
    - Type-safe broadcast functions for all event types
14. Add realtime broadcasts to all API routes:
    - Emit `player_joined`, `round_start`, `buzz`, `round_result`, `reveal`, `game_end`
    - Include relevant payload data (player IDs, scores, timestamps)
15. Create hooks for game state:
    - `hooks/useGame.ts` - Subscribe to game channel, sync state
    - `hooks/useHost.ts` - Host-specific controls and permissions
    - `hooks/usePlayer.ts` - Player-specific controls (buzz button)
    - Listen for all event types and update local React state
    - Provide methods to call API routes

### Phase 5: UI Development (Day 2, Afternoon/Evening)
**Goal**: Fully playable game flow with host and player views

16. **Home page** (`/app/page.tsx`) using Shadcn components:
    - "Host Game" button → create session → redirect to `/host/[id]`
    - "Join Game" input (game code) → redirect to `/play/[id]`
    - Pack selector for host
17. **Host Lobby** (`/app/host/[id]/page.tsx` + `/components/host/HostLobby.tsx`):
    - Show game code and QR code for players to join
    - Display shareable join link for players
    - Display host name and list of joined players (real-time updates)
    - Player count indicator (2-10)
    - "Start Game" button (enabled when ≥2 players)
18. **Player Lobby** (`/app/play/[id]/page.tsx` + `/components/game/PlayerLobby.tsx`):
    - Join form (enter player name)
    - Display list of all players who have joined
    - Waiting message until host starts game
19. **Host Game View** (`/components/host/HostGameView.tsx`):
    - Round counter (e.g., "Round 3/10")
    - Leaderboard showing all players and scores
    - Audio controls (play/pause)
    - Buzzer indicator showing who buzzed and elapsed time
    - Judgment controls: "Correct ✓" and "Incorrect ✗" buttons
    - Track reveal (title/artist)
    - "Next Round" button
20. **Player Game View** (`/components/game/PlayerGameView.tsx`):
    - Round counter
    - Leaderboard (their score highlighted)
    - Large "BUZZ!" button (disabled after someone buzzes)
    - Buzzer feedback (show who buzzed first)
    - Track reveal after host judgment
    - Score change animation (+26.5 or -10)
21. **Final Score** (`/components/game/FinalScore.tsx`):
    - Winner podium (top 3 players)
    - Full leaderboard with final scores
    - Round-by-round breakdown
    - "Play Again" button (creates new session)

### Phase 6: Audio & Polish (Day 3, Morning)
**Goal**: Production-ready experience

22. Implement audio system (`lib/audio/player.ts`):
    - Preload preview URL for current track
    - Play on round start (host device only)
    - Track elapsed time precisely (for scoring)
    - Immediate stop on buzz event
    - Error handling for failed loads
23. Add UI polish with Shadcn components:
    - Buzz animation (screen flash, confetti for correct answer)
    - Score update animations (smooth increment/decrement)
    - Loading states (Shadcn Skeleton components)
    - Toast notifications for errors (Shadcn Toast)
    - Responsive mobile design (mobile-first)
    - Leaderboard transitions and highlights
24. Error handling:
    - Network disconnection recovery (reconnect to Realtime)
    - Invalid game codes (redirect to home)
    - Missing audio URLs (skip track, log error)
    - Race condition safeguards (server-side validation)
    - Player limit enforcement (max 10)

### Phase 7: Testing & Deployment (Day 3, Afternoon)
**Goal**: Live and accessible with automated CI/CD

25. Manual testing checklist:
    - Run Python scripts to populate database with 20+ tracks
    - Full 10-round game with 2 players minimum
    - Test with 5+ players for stress testing
    - Test all scoring scenarios (correct, incorrect, no buzz)
    - Test edge cases (player leaves, refresh page, host disconnects)
    - Mobile device testing (iOS Safari, Android Chrome)
26. CI/CD verification:
    - Verify GitHub Actions workflow passes
    - Test PR preview deployments
    - Verify main branch auto-deploys to production
27. Production deployment:
    - Vercel project setup with GitHub integration
    - Configure environment variables (Supabase keys)
    - Enable preview deployments for PRs
28. Supabase production setup:
    - Run migrations on production database
    - Configure Row Level Security (optional for MVP)
    - Set up database backups
    - Test with production URL

---

## 🔮 Future Enhancements (Post-MVP)

### Phase 2.0: Dual Listening Mode (Remote Play)
**Priority**: High | **Effort**: Medium

**What**: All players hear audio simultaneously on their own devices (host still controls)

**Implementation**:
- Add mode selector when creating game (Speaker vs. Dual Listening)
- Synchronized audio start using coordinated timestamps:
  ```typescript
  const startTime = Date.now() + 3000; // 3s delay for sync
  broadcast('audio_start', { startTime, trackUrl });
  setTimeout(() => audio.play(), startTime - Date.now());
  ```
- Handle network latency adjustments
- Ensure buzz timing still accurate despite different device playback
- Audio stops on all devices when someone buzzes

**Benefits**: Enables remote gameplay, expands user base significantly

---

### Phase 2.5: Host Spotify OAuth Integration
**Priority**: Medium | **Effort**: Medium

**What**: Host can authenticate with Spotify to play full tracks (beyond 30s preview)

**Implementation**:
- Spotify OAuth flow for host account
- Store refresh token for host session
- Use Spotify Web Playback SDK on host device
- Fallback to preview URLs for non-authenticated hosts

**Benefits**:
- Full track playback (not just 30s previews)
- Access to host's Spotify Premium account
- Better audio quality
- More flexibility in track selection

---

### Phase 3.0: Spotify API Integration
**Priority**: Medium | **Effort**: High

**What**: Dynamically fetch tracks instead of manual entry

**Implementation**:
- Spotify Developer account and OAuth setup
- Search API integration for track discovery
- Automated pack generation by genre/decade/playlist
- Preview URL validation (some tracks don't have previews)
- Rate limiting and caching strategy

**Benefits**:
- Massive content library
- Auto-updating packs
- Less admin maintenance

**Challenges**:
- Preview URLs expire (need refresh logic)
- Not all tracks have 30s previews
- API rate limits

---

### Phase 4.0: User Accounts & Persistence
**Priority**: Medium | **Effort**: Medium

**What**: Full authentication system with profile and history

**Implementation**:
- Supabase Auth (email/password, social logins)
- User profiles table
- Game history tracking
- Persistent stats:
  - Total games played
  - Win/loss record
  - Average buzz time
  - Favorite genres
- Leaderboards

**Options**:
- **Full accounts**: All players must sign in
- **Hybrid**: Host signs in, guests stay anonymous
- **Optional**: Link anonymous sessions to account post-game

**Benefits**:
- Player engagement and retention
- Unlock achievement systems
- Friend lists and challenges

---

### Phase 5.0: Custom Pack Creation (User-Generated Content)
**Priority**: Medium | **Effort**: Medium

**What**: Players can create and share themed packs

**Implementation**:
- Public pack gallery
- Pack creation UI (copy admin panel)
- Share pack by link or code
- Voting/rating system
- Moderation tools (report inappropriate content)
- Pack categories/tags

**Benefits**:
- Community engagement
- Unlimited content variety
- Viral sharing potential

**Risks**:
- Copyright issues with user submissions
- Moderation overhead
- Broken preview URLs

---

### Phase 6.0: Enhanced Game Modes
**Priority**: Low | **Effort**: Variable

**Ideas**:
1. **Difficulty Levels**
   - Easy: 30s preview, popular songs
   - Medium: 15s preview
   - Hard: 5s preview, obscure tracks
   - Expert: 2s preview from random timestamp

2. **Speed Round Mode**
   - 20 rounds, 3 seconds each
   - No reveal screen, immediate next track
   - Fast-paced arcade style

3. **Team Mode**
   - 2v2 or 3v3 gameplay
   - Shared buzz button per team
   - Team strategy element

4. **Progressive Difficulty**
   - Rounds get harder as game progresses
   - Earlier rounds worth fewer points

5. **Wager System**
   - Bet confidence before buzzing
   - High risk, high reward

---

### Phase 7.0: Advanced Features
**Priority**: Low | **Effort**: High

**Ideas**:
1. **Voice Recognition**
   - Speak answer instead of self-scoring
   - Speech-to-text verification
   - Reduces cheating potential

2. **Video Mode**
   - Music video clips instead of audio
   - Visual + audio clues

3. **Live Spectator Mode**
   - Share game link for viewers
   - Read-only game state
   - Chat/reactions

4. **Tournament Mode**
   - Bracket-style competitions
   - 8/16/32 player tournaments
   - Automated pairings

5. **Daily Challenges**
   - New pack every day
   - Global leaderboard
   - Time-limited events

6. **Analytics Dashboard**
   - Most buzzed genres
   - Average response time
   - Win rate by pack
   - Detailed performance metrics

---

## 📊 MVP Success Metrics

### Technical Metrics
- [ ] Game session creation success rate > 99%
- [ ] Realtime sync latency < 500ms (all players see buzz within 500ms)
- [ ] Audio load success rate > 95%
- [ ] Buzz race condition handling (atomic, no double-wins)
- [ ] Accurate elapsed time tracking (±100ms precision)
- [ ] Support 2-10 concurrent players per game
- [ ] CI/CD pipeline runs successfully on all PRs

### User Experience Metrics
- [ ] Average session duration: 15-20 minutes (10 rounds)
- [ ] Game completion rate > 80% (start → finish)
- [ ] Mobile responsive (iPhone 12+ and Android equivalents)
- [ ] Zero-to-playing time < 2 minutes (DJ setup + players join)
- [ ] Clear separation between DJ controls and player controls

---

## 🚧 Known Limitations (MVP)

### What MVP Will NOT Have
- No user accounts or persistent login (anonymous sessions only)
- No game history or stats tracking
- No remote play (Dual Listening mode - in-person only for MVP)
- No Spotify OAuth (30s preview URLs only)
- No Spotify API integration for dynamic track fetching
- No custom pack sharing or user-generated content
- No difficulty settings or alternate game modes
- No mobile app (web-only PWA)
- No offline mode
- No sound effects or background music
- No video clips

### Technical Debt
- No comprehensive test coverage (manual testing + CI linting only)
- No error logging/monitoring (Sentry, etc.)
- No analytics tracking (no usage metrics)
- No database RLS policies (open access for MVP)
- Manual database cleanup for old sessions

### Accepted Risks
- **Spotify URLs may expire**: Manual script re-run required
- **No authentication**: Anyone can create/join games
- **Session cleanup**: Old sessions stay in DB (manual cleanup needed)
- **Host trust model**: Host controls scoring, relies on honesty
- **No session recovery**: If host disconnects, game may be unrecoverable

---

## 🎨 Design Principles

### User Experience
1. **Zero friction**: No signup, no tutorial, just play
2. **Mobile-first**: Large touch targets (buzz button for players)
3. **Clear feedback**: Animations for every state change
4. **Fast pace**: Minimize time between rounds
5. **Role clarity**: Clear separation between host controls and player actions

### Code Quality
1. **Type safety**: Strict TypeScript everywhere
2. **Server authority**: All game logic server-side
3. **Atomic operations**: Concurrent buzz handling
4. **Real-time sync**: Server state is source of truth

### Scalability Considerations (Future)
- Database indexes on frequently queried columns
- CDN for static assets
- Connection pooling for Supabase
- Rate limiting on API routes
- Caching layer for pack/track data

---

## 📝 Open Questions

### For MVP
- [ ] What happens if a player refreshes during a game? (Re-join with same name?)
- [ ] What happens if host refreshes/disconnects? (Game ends? Resume capability?)
- [ ] Should we show a live timer during play phase on host screen?
- [ ] What if a pack has < 10 tracks? (Error or allow shorter games?)
- [ ] Maximum elapsed time before auto-skip? (30s timeout? No timeout?)
- [ ] Can host also play as a contestant, or purely control role?
- [ ] Should players see each other's names in real-time during buzzing?
- [ ] Score display: show all players all the time, or only top 3 + your position?

### For Future
- [ ] Monetization strategy? (Premium packs, ads, subscription?)
- [ ] Content licensing for scraped Trackstar content?
- [ ] Mobile app vs. PWA vs. web-only?
- [ ] Internationalization? (Multi-language support)
- [ ] Spotify licensing for OAuth/full track playback?

---

## 🏁 Definition of Done (MVP)

**MVP is complete when:**
1. ✅ Python scripts can scrape and populate database with 20+ tracks in packs
2. ✅ Host can create a game, select pack, and share join code/link
3. ✅ 2-10 players can join game with display names
4. ✅ All players and host see synchronized game state in real-time
5. ✅ Audio plays on host device only, all players can buzz
6. ✅ First buzz always wins (no race conditions), elapsed time recorded accurately
7. ✅ Host can judge correct/incorrect, points calculated properly (30 - elapsed or -10)
8. ✅ Leaderboard updates in real-time for all players
9. ✅ All 10 rounds complete, winner declared with final scores
10. ✅ Shadcn UI components used throughout (Button, Card, Toast, etc.)
11. ✅ CI/CD pipeline working (GitHub Actions → Vercel)
12. ✅ Deployed to production URL
13. ✅ Successfully tested end-to-end with 4+ real players

**Ready to ship when:**
- All 13 checklist items pass
- No critical bugs
- Works on mobile Chrome and Safari
- CI/CD pipeline green on main branch
- Supabase production database is stable and populated

---

## 📚 Resources

### Documentation
- Next.js 15 App Router: https://nextjs.org/docs
- Supabase Realtime: https://supabase.com/docs/guides/realtime
- Shadcn UI: https://ui.shadcn.com/
- Spotify Preview URLs: https://developer.spotify.com/documentation/web-api/reference/get-track
- GitHub Actions: https://docs.github.com/en/actions

### Tools & Libraries
- Vercel for hosting and deployment
- Supabase for database + realtime sync
- Shadcn UI for component library
- Tailwind CSS for styling
- Lucide React for icons (included with Shadcn)
- QR Code generator library (qrcode.react or similar)
- Python with BeautifulSoup4 for scraping
- GitHub Actions for CI/CD

---

**Document Version**: 2.0
**Last Updated**: 2025-11-14
**Status**: Ready for implementation

---

## 📝 Changelog

### Version 2.0 (2025-11-14)
- **BREAKING**: Changed from 2-player to 2-10 player support
- **BREAKING**: Replaced self-scoring with host-judged scoring
- **NEW**: Added host role as game controller (controls game flow and audio)
- **NEW**: Speed-based scoring system (30 - elapsed_seconds for correct, -10 for incorrect)
- **NEW**: Shadcn UI component library requirement
- **NEW**: CI/CD pipeline as MVP requirement
- **NEW**: Shareable join links for players
- **CHANGED**: Replaced admin panel with Python scripts for data population
- **CHANGED**: Updated database schema to support multiple players
- **CHANGED**: Simplified state machine (removed separate score state)
- **CHANGED**: Split UI into host view (`/host/[id]`) and player view (`/play/[id]`)
- **ADDED**: Phase 2.5 for future Spotify OAuth integration for host
- Updated all sections to reflect multiplayer architecture and host/player terminology
