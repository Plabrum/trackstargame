

  I'm designing a web-based music guessing game called Trackstar Game, inspired
  by the popular Trackstarshow street interviews. Players compete to guess the
  artist after listening to songs, racing to buzz in with the correct answer.

  Brand Identity & Color Direction

  Trackstarshow Essence:
  - A love letter to New York: Always shot on NYC streets with urban, authentic
  energy
  - A celebration of music history: Deep dives into artists, their stories, and
  album art
  - Visual signature: Blurred album covers during gameplay create mystery and
  anticipation

  Brand Colors to Use:
  - Primary Brand: Orange (#FF6B35 or similar vibrant orange) + White
  - Typography Base: Strong black text on white backgrounds, white text on
  black/dark backgrounds for high contrast
  - Accent for Interactive Elements: Use orange gradients (light orange to dark
  orange/red-orange) instead of purple-pink
  - Supporting Palette:
    - Deep charcoal/black for grounding
    - Warm grays (not cool grays)
    - Cream/off-white backgrounds (warmer than pure white)
    - Status colors: Green for correct, Red for incorrect, Bright yellow/amber
  for buzz
  - NYC Street Vibe: Gritty textures, concrete grays, subway tile whites, taxi
  yellows, urban oranges

  Design Inspiration:
  - NYC subway signage (bold Helvetica, orange circles, black and white)
  - Vintage concert posters (bold typography, high contrast)
  - Vinyl record sleeves (square format, album art focus)
  - Street photography (authentic, high contrast, warm tones)

  Game Mechanics Overview

  Two User Roles:
  1. Host - Controls the game, plays music via Spotify, judges answers
  2. Players (2-10) - Compete to guess artists, buzz in or submit text answers

  Game Flow:
  1. Home → Host selects music pack OR Player joins with game code
  2. Lobby → Players join via QR code/game code, host configures settings
  3. Gameplay → 10 rounds of music, buzz-in competition, real-time scoring
  4. Final Score → Winner podium, full leaderboard, celebration

  Scoring System:
  - Correct answer: 30 - elapsed seconds (faster = more points)
  - Incorrect answer: -10 points
  - First to buzz gets to answer (in party mode)
  - Text input mode: type artist names with auto-validation

  ---
  Figma Board Structure (Specific Deliverables)

  Board 1: Design System & Foundation

  Page 1.1 - Brand & Color Palette
  - Trackstar logo variations (horizontal, stacked, icon-only)
  - Primary colors with hex codes (Orange primary, black, white, warm grays)
  - Orange gradient swatches (for buttons, headings, interactive elements)
  - Status colors (success green, error red, warning yellow, info blue)
  - Background colors (cream, warm white, light gray, charcoal, black)
  - Color usage rules (text on backgrounds, contrast ratios, accessibility notes)

  Page 1.2 - Typography System
  - Font family selection (consider: Helvetica Neue for NYC vibe, or Inter/Work
  Sans for web)
  - Type scale with exact sizes:
    - Display: 64px (logo, hero headings)
    - H1: 48px (page titles)
    - H2: 32px (section headers)
    - H3: 24px (card titles)
    - Body Large: 18px (primary actions)
    - Body: 16px (standard text)
    - Body Small: 14px (metadata, captions)
    - Tiny: 12px (labels, badges)
  - Font weights (regular 400, medium 500, semibold 600, bold 700, black 900)
  - Line heights and letter spacing
  - Typography usage examples (heading + body pairings)

  Page 1.3 - Spacing & Layout Grid
  - 8px base unit system
  - Common spacing values (8, 16, 24, 32, 48, 64, 96px)
  - Layout grids:
    - Mobile: 16px margins, single column
    - Tablet: 24px margins, 8-column grid
    - Desktop: 32px margins, 12-column grid
  - Container max-widths (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
  - Breakpoints (mobile: 0-767px, tablet: 768-1023px, desktop: 1024px+)

  Page 1.4 - Elevation & Shadows
  - Shadow system (none, sm, md, lg, xl for cards and overlays)
  - Border radius values (sm: 4px, md: 8px, lg: 16px, full: 9999px)
  - Border weights (1px, 2px for emphasis)

  ---
  Board 2: Component Library

  Page 2.1 - Buttons
  - Primary Button: Orange gradient background, white text, large (56px tall),
  rounded corners
    - States: Default, Hover (darker gradient), Active (pressed/scale down),
  Disabled (50% opacity), Loading (spinner)
    - Sizes: Small (40px), Medium (48px), Large (56px), XL (64px for mobile
  primary actions)
  - Secondary Button: White background, orange border (2px), orange text
    - States: Default, Hover (orange background, white text), Active, Disabled
  - Judgment Buttons (Host only):
    - Correct: Green background, white checkmark icon + "Correct" text (56px
  tall, full width on mobile)
    - Incorrect: Red background, white X icon + "Incorrect" text
  - BUZZ Button (Player, HERO component):
    - 200px tall on mobile, 160px on desktop
    - Orange gradient background (light to dark, animated pulse when active)
    - Huge text: "BUZZ" in 48px bold
    - Tactile feel: Subtle inner shadow, scale down on press
    - States: Active (pulsing), Buzzed (locked, gray), Disabled (transparent)

  Page 2.2 - Cards
  - Standard Card: White background, subtle shadow (md), 8px rounded corners,
  24px padding
    - Variants: Default, Hover (shadow-lg + slight scale), Selected (orange
  border 2px)
  - Pack Card (Music pack selection):
    - Album-style square or 3:2 ratio
    - Background image (blurred album art or solid color)
    - Overlay gradient (dark at bottom for text legibility)
    - Title + description + track count
    - "View Songs" secondary button + "Start Game" primary button
  - Status Card (Game state indicators):
    - Info background (light blue), Warning (light yellow), Success (light
  green), Error (light red)
    - Icon + heading + description layout
    - 16px padding, sm rounded corners

  Page 2.3 - Forms & Inputs
  - Text Input: 56px tall (touch-friendly), 16px padding, gray border (1px),
  orange border on focus (2px)
    - Variants: Default, Focus, Error (red border + error message below),
  Success, Disabled
    - Label above (14px, semibold, black)
  - Game Code Input (Special):
    - Large text (32px, monospace, uppercase)
    - 6-8 character display
    - Letter-spaced for clarity
  - Toggle Switch: iOS-style switch, orange when on, gray when off (for settings)
  - Select Dropdown: Match text input styling, chevron icon
  - Slider (Volume control): Orange track fill, large thumb (24px circle)

  Page 2.4 - Badges & Status Indicators
  - Rank Badges: Circle with number inside
    - 1st: Gold background (#FFD700), black text
    - 2nd: Silver background (#C0C0C0), black text
    - 3rd: Bronze background (#CD7F32), white text
    - 4th+: Gray background, white text
    - Size: 32px diameter for leaderboard, 24px for compact
  - Status Badges: Pill shape, 8px vertical padding, 12px horizontal
    - Game Code: Black background, white text, monospace
    - Player Count: Orange background, white text
    - Round Counter: White background, black text, black border
  - Score Change Indicator: Floating text with +/- prefix
    - Positive: Green, +26.5 format
    - Negative: Red, -10 format
    - Animated: Fade in, float up, fade out (1 second total)

  Page 2.5 - Icons
  - Icon set (24px default size, 32px for emphasis, 48px for hero):
    - Trophy (winner)
    - Medals (1st, 2nd, 3rd place)
    - Music notes, vinyl record, headphones
    - Checkmark (correct), X (incorrect)
    - Buzz icon (lightning bolt or sound wave)
    - QR code frame
    - Volume/speaker icons
    - Play/pause controls
    - Users/player icons
    - Copy, share, logout icons
  - Style: Outlined or filled, consistent stroke width (2px)

  ---
  Board 3: Key Screens - Mobile (375x812 iPhone)

  Page 3.1 - Home Page (Mobile)
  - Full screen: Cream background
  - Top: Trackstar logo (orange and white, centered, 64px text)
  - Middle: Two stacked cards:
    - "Host a Game" card: Spotify icon + "Sign in with Spotify" button
    - "Join a Game" card: Text input for game code + "Join" button
  - Bottom: "How to Play" section (3 steps, numbered, icons + text)
  - Spacing: 32px between major sections

  Page 3.2 - Player Lobby (Mobile)
  - Header: Game code badge (large, black background, white text, centered)
  - Host name (16px, below code)
  - Card: "Enter your name" form
    - Name input (56px tall)
    - "Join Game" primary button (orange, full width, 56px tall)
  - Player list below: Card with player names + checkmarks
    - Auto-scrolling if >6 players
  - Footer: Waiting animation (pulse dots or spinner)

  Page 3.3 - Player Game View - Active Round (Mobile)
  - Top bar (sticky):
    - Round counter: "Round 3/10" (left)
    - Personal score badge: "26.5 pts" (right)
    - Rank badge: "#2" with silver background (far right)
  - Main area:
    - Huge BUZZ button: 200px tall, orange gradient, "BUZZ" in 48px
    - State text above: "Listening..." or "Buzzed!" or "Answered"
    - Buzz animation overlay (full-screen yellow flash when pressed)
  - Bottom: Leaderboard card (collapsed, expandable)
    - Shows top 3 + current player if not in top 3
    - Tap to expand full list

  Page 3.4 - Player Game View - Text Input Mode (Mobile)
  - Same top bar
  - Main area:
    - State text: "Type the artist name"
    - Large text input (64px tall, 24px font size)
    - "Submit Answer" primary button (56px tall, orange, full width)
    - Timer indicator: Small progress bar or countdown
  - Bottom: Leaderboard (same as 3.3)

  Page 3.5 - Final Score (Mobile)
  - Header: "Game Over!" in orange gradient (48px)
  - Winner section:
    - Trophy icon (96px, gold)
    - Winner name (32px, bold)
    - Winner score (24px, gold color)
  - Top 3 cards (if 3+ players):
    - Stacked vertically
    - Each card: Medal icon + name + score
    - Gold/silver/bronze backgrounds
  - Full leaderboard: Scrollable list below
  - "Play Again" button (bottom, fixed, orange, 56px tall)

  ---
  Board 4: Key Screens - Desktop (1440x900)

  Page 4.1 - Home Page (Desktop)
  - Max-width container (1024px, centered)
  - Two-column layout:
    - Left: "Host a Game" card (larger)
    - Right: "Join a Game" card
  - Logo above (centered, 96px)
  - "How to Play" section below in 3-column grid

  Page 4.2 - Host Lobby (Desktop)
  - Two-column layout (60/40 split):
    - Left column:
        - Game settings form (rounds, mode, toggles)
      - QR code display (300x300px, centered)
      - Game code (large, 48px, below QR)
      - Join link with copy button
    - Right column (sticky):
        - Player list (live updates)
      - Player count badge at top
      - Auto-scroll if >10 players
  - Bottom: "Start Game" button (fixed, full width, 64px tall, orange)

  Page 4.3 - Host Game View - Active Round (Desktop)
  - Three-column layout:
    - Left/Center (66%):
        - Round counter (top, 32px)
      - Spotify playback controls card:
            - Album art (if not blurred mode, or blurred during play)
        - Play/pause button
        - Volume slider
      - Round state card:
            - State: "Music Playing" or "Player Buzzed: John"
        - Judgment buttons (Correct/Incorrect, side-by-side, large)
      - Track reveal area (after judgment):
            - Album art (unblurred, large)
        - Song title + artist (24px, bold)
    - Right sidebar (33%, sticky):
        - Leaderboard card (always visible)
      - Scrollable if >8 players
      - Top 3 highlighted with gold/silver/bronze
  - Bottom: "Next Round" or "End Game" button (fixed)

  Page 4.4 - Final Score (Desktop)
  - Max-width container (1280px)
  - Header: "Game Over!" centered, orange gradient (64px)
  - Winner spotlight: Trophy + name + score (centered, large)
  - Top 3 podium: Three cards side-by-side (gold/silver/bronze)
  - Full leaderboard below: Single column, centered (max-width 600px)
  - "Play Again" button (centered, 64px tall)

  ---
  Board 5: Animations & Interactions

  Page 5.1 - Buzz Animation Sequence
  - Frame 1: Default state (orange button)
  - Frame 2: Pressed state (scaled down 95%, darker gradient)
  - Frame 3: Full-screen flash (yellow overlay, 100ms)
  - Frame 4: Button locked state (gray, disabled)
  - Timing notes: Total animation 300ms

  Page 5.2 - Score Change Animation
  - Frame sequence:
    - Frame 1: Score appears above player's score badge (+26.5, green, 24px)
    - Frame 2-4: Floats up 40px while fading from 100% to 0% opacity
    - Total duration: 1000ms, ease-out curve
  - Spring physics for score number update (count-up effect)

  Page 5.3 - Leaderboard Rank Change
  - Show player row transitioning from rank 3 to rank 2:
    - Frame 1: Player at position 3 (bronze badge)
    - Frame 2: Players swap positions (200ms smooth transition)
    - Frame 3: Player at position 2 (silver badge, subtle glow for 500ms)

  Page 5.4 - Real-Time Player Join
  - Lobby player list:
    - New player row fades in from 0% to 100% opacity (300ms)
    - Slight scale animation (95% to 100%)
    - Green checkmark appears with bounce

  Page 5.5 - Loading States
  - Skeleton screens for:
    - Pack gallery loading (card outlines with shimmer effect)
    - Leaderboard loading (row outlines with pulse)
    - Spotify player loading (playback controls disabled, spinner)
  - Spinner variants (orange, small/medium/large)

  ---
  Board 6: Special States & Edge Cases

  Page 6.1 - Empty States
  - No players in lobby: Illustration + "Waiting for players..." text
  - No packs available: "No music packs found" with action button
  - Connection lost: "Reconnecting..." overlay with spinner

  Page 6.2 - Error States
  - Invalid game code: Red error message below input
  - Spotify connection failed: Error card with "Retry" button
  - Judgment timeout: "No answer submitted" state

  Page 6.3 - Responsive Breakpoints
  - Show same screen at 3 sizes:
    - Mobile (375px)
    - Tablet (768px)
    - Desktop (1440px)
  - Annotate layout changes (single column → two column → three column)

  Page 6.4 - Accessibility States
  - Focus states: Orange outline (2px) for keyboard navigation
  - High contrast mode considerations
  - Touch target sizes (minimum 48x48px, annotated)

  ---
  Board 7: Album Art & Music Elements

  Page 7.1 - Blurred Album Art Effect
  - Show progression:
    - Default: Sharp album cover
    - During play: Heavy blur (30px blur radius) + slight scale (105%)
    - On reveal: Blur removes with smooth transition (500ms)

  Page 7.2 - Music Pack Card Variations
  - 6 example pack cards with different themes:
    - 90s Hip Hop (urban colors, boombox imagery)
    - Indie Rock (analog textures, guitar silhouette)
    - R&B Classics (smooth gradients, vinyl record)
    - Electronic/Dance (vibrant colors, waveforms)
    - Jazz Standards (vintage sepia, saxophone)
    - Pop Hits (bright colors, microphone icon)

  Page 7.3 - Spotify Integration UI
  - Playback controls layout:
    - Play/pause button (56px circle, orange or white)
    - Volume slider with speaker icon
    - Track progress bar (thin, orange fill)
    - Current time / total time

  ---
  NYC Street Culture + Music Love Aesthetic

  Design Principles:
  - Urban energy: Bold typography, high contrast, street photography feel
  - Music-first: Album art as hero images, vinyl/turntable iconography
  - Authenticity: Avoid overly polished/corporate design, keep it raw and
  passionate
  - Community: Emphasize multiplayer, social aspect (player lists, leaderboards)
  - Nostalgia: Retro music elements (cassette tapes, boomboxes) as accent
  graphics
  - NYC Specific: Subway tile patterns, graffiti-inspired accents, yellow taxi
  color pops, concrete textures

  Texture & Details:
  - Subtle noise/grain overlays on backgrounds (10% opacity)
  - Distressed edges on badges/buttons (optional, for authenticity)
  - Hand-drawn elements (underlines, arrows, stars) for emphasis
  - Polaroid-style photo frames for album art reveals
  - Urban photography as background images (NYC streets, blurred)

  ---
  Technical Constraints & Notes

  - Responsive web app: Mobile-first design (works on phones, tablets, desktops)
  - React component architecture: Design with component reusability in mind
  (buttons, cards, badges should be variants of base components)
  - Animations via Framer Motion: All transitions should be programmable (avoid
  complex After Effects-only animations)
  - Tailwind CSS styling: Use standard spacing scales (8px increments), avoid
  arbitrary pixel values
  - Real-time updates: Design for live data changes without jarring layout shifts
   (allocate fixed space for dynamic content)
  - Touch targets: Minimum 48x48px for all interactive elements (iOS/Android
  guidelines)
  - Performance: Optimize images (use WebP), limit animation complexity on
  low-end devices

  ---
  Final Checklist for Designer:
  - All 7 Figma boards completed with pages as outlined
  - Orange-based color system (no purple/pink)
  - Component library with all states (hover, active, disabled, loading)
  - Mobile and desktop versions of all key screens
  - Animation specs with timing and easing curves
  - Accessibility annotations (contrast ratios, focus states, touch targets)
  - Typography scale with exact sizes and weights
  - Spacing system documented (8px base unit)
  - Iconography set (24px base size)
  - Blurred album art mockups
  - NYC/music culture aesthetic implemented throughout

  This structure should give your designer a clear roadmap with specific
  deliverables for each board!

