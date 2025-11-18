# Action-Based State Machine - Usage Guide

## Phase 1 Complete ✅

The enhanced state machine is now implemented with:
- ✅ Action descriptor types
- ✅ Game context type
- ✅ `getAvailableActions()` function
- ✅ 37 comprehensive unit tests (all passing)
- ✅ Full TypeScript type safety

## What's New

### Core Types

```typescript
// All exported from lib/game/state-machine.ts

type Role = 'host' | 'player';

type HostAction =
  | { type: 'start_game' }
  | { type: 'judge_answer'; correct: boolean }
  | { type: 'finalize_judgments'; overrides?: Record<string, boolean> }
  | { type: 'advance_round' }
  | { type: 'end_game' }
  | { type: 'update_settings'; settings: GameSettings }
  | { type: 'reveal_answer' };

type PlayerAction =
  | { type: 'join_session'; playerName: string }
  | { type: 'buzz' }
  | { type: 'submit_answer'; answer: string };

type ActionDescriptor<T> = {
  action: T;
  label: string;           // "Start Game", "Buzz In", etc.
  description: string;     // "Begin the game with 2 player(s)"
  enabled: boolean;        // Can this action be performed?
  disabledReason?: string; // "Need at least 2 players"
  variant?: 'primary' | 'secondary' | 'danger';
};

type GameContext = {
  sessionId: string;
  state: GameState;
  currentRound: number;
  totalRounds: number;
  allowSingleUser: boolean;
  allowHostToPlay: boolean;
  enableTextInputMode: boolean;
  playerCount: number;
  hasJoined: boolean;
  playerId?: string;
  hasPlayerBuzzed?: boolean;
  hasCurrentPlayerSubmitted?: boolean;
  allPlayersSubmitted?: boolean;
};
```

### Main Function

```typescript
function getAvailableActions(
  state: GameState,
  role: Role,
  context: GameContext
): ActionDescriptor[]
```

## Usage Examples

### Example 1: Host in Lobby

```typescript
import { getAvailableActions, GameContext } from '@/lib/game/state-machine';

// Build context from your game session data
const context: GameContext = {
  sessionId: session.id,
  state: session.state,
  currentRound: session.current_round ?? 1,
  totalRounds: session.total_rounds,
  allowSingleUser: session.allow_single_user,
  allowHostToPlay: session.allow_host_to_play,
  enableTextInputMode: session.enable_text_input_mode,
  playerCount: players.length,
  hasJoined: true, // Host is always joined
};

// Get available actions
const actions = getAvailableActions(context.state, 'host', context);

// Render actions in UI
{actions.map((actionDesc) => (
  <Button
    key={actionDesc.action.type}
    onClick={() => handleAction(actionDesc.action)}
    disabled={!actionDesc.enabled}
    variant={actionDesc.variant}
  >
    {actionDesc.label}
    {actionDesc.disabledReason && (
      <Tooltip>{actionDesc.disabledReason}</Tooltip>
    )}
  </Button>
))}
```

**Output** (with 2 players in lobby):
```javascript
[
  {
    action: { type: 'start_game' },
    label: 'Start Game',
    description: 'Begin the game with 2 player(s)',
    enabled: true,
    variant: 'primary',
  },
  {
    action: { type: 'update_settings', settings: {} },
    label: 'Game Settings',
    description: 'Configure game options',
    enabled: true,
    variant: 'secondary',
  },
  {
    action: { type: 'end_game' },
    label: 'Cancel Game',
    description: 'End the game without starting',
    enabled: true,
    variant: 'danger',
  },
]
```

### Example 2: Player During Round

```typescript
const context: GameContext = {
  sessionId: session.id,
  state: 'playing',
  currentRound: session.current_round,
  totalRounds: session.total_rounds,
  allowSingleUser: session.allow_single_user,
  allowHostToPlay: session.allow_host_to_play,
  enableTextInputMode: session.enable_text_input_mode,
  playerCount: players.length,
  hasJoined: true,
  playerId: player.id,
  hasPlayerBuzzed: currentRound?.buzzer_player_id != null,
  hasCurrentPlayerSubmitted: hasSubmittedAnswer,
};

const actions = getAvailableActions('playing', 'player', context);
```

**Output** (no one has buzzed yet):
```javascript
[
  {
    action: { type: 'buzz' },
    label: 'Buzz In',
    description: 'Signal that you know the answer',
    enabled: true,
    variant: 'primary',
  },
]
```

**Output** (someone already buzzed):
```javascript
[
  {
    action: { type: 'buzz' },
    label: 'Buzz In',
    description: 'Signal that you know the answer',
    enabled: false,
    disabledReason: 'Someone already buzzed',
    variant: 'primary',
  },
]
```

### Example 3: Handling Actions

```typescript
function handleAction(action: HostAction | PlayerAction) {
  switch (action.type) {
    case 'start_game':
      startGameMutation.mutate(sessionId);
      break;

    case 'buzz':
      buzzMutation.mutate({ sessionId, playerId });
      break;

    case 'judge_answer':
      judgeAnswerMutation.mutate({
        sessionId,
        correct: action.correct
      });
      break;

    case 'advance_round':
      advanceRoundMutation.mutate(sessionId);
      break;

    // ... other actions
  }
}
```

### Example 4: Custom Hook for Actions

```typescript
// hooks/useGameActions.ts
import { useMemo } from 'react';
import { getAvailableActions, GameContext, Role } from '@/lib/game/state-machine';

export function useGameActions(
  role: Role,
  session: GameSession | null,
  players: Player[],
  currentRound?: GameRound,
  playerId?: string
) {
  return useMemo(() => {
    if (!session) return [];

    const context: GameContext = {
      sessionId: session.id,
      state: session.state as GameState,
      currentRound: session.current_round ?? 1,
      totalRounds: session.total_rounds,
      allowSingleUser: session.allow_single_user,
      allowHostToPlay: session.allow_host_to_play,
      enableTextInputMode: session.enable_text_input_mode,
      playerCount: players.length,
      hasJoined: role === 'host' || players.some(p => p.id === playerId),
      playerId,
      hasPlayerBuzzed: currentRound?.buzzer_player_id != null,
      // ... other context fields
    };

    return getAvailableActions(session.state as GameState, role, context);
  }, [session, players, currentRound, role, playerId]);
}
```

**Usage in component:**
```typescript
function HostGameView({ session, players, currentRound }) {
  const actions = useGameActions('host', session, players, currentRound);

  return (
    <div className="actions-panel">
      {actions.map(actionDesc => (
        <ActionButton key={actionDesc.action.type} {...actionDesc} />
      ))}
    </div>
  );
}
```

## Benefits

### 1. **Declarative UI**
No more complex conditionals:

```typescript
// Before (imperative)
{state === 'lobby' && playerCount >= 2 && (
  <button onClick={startGame}>Start Game</button>
)}
{state === 'lobby' && playerCount < 2 && (
  <button disabled>Need 2 players</button>
)}

// After (declarative)
{actions.map(action => <ActionButton {...action} />)}
```

### 2. **Automatic Accessibility**
- Labels for screen readers
- Descriptions for tooltips
- Disabled reasons for user feedback
- Semantic variants (primary/secondary/danger)

### 3. **Type Safety**
- TypeScript enforces exhaustive action handling
- Action types are discriminated unions
- Auto-complete for action properties

### 4. **Testability**
```typescript
// Pure function - easy to test
const actions = getAvailableActions('lobby', 'host', context);
expect(actions.find(a => a.action.type === 'start_game')?.enabled).toBe(true);
```

### 5. **Single Source of Truth**
All game rules are in one place: `lib/game/state-machine.ts`

## Testing

Run the test suite:
```bash
pnpm test
```

All 37 tests cover:
- ✅ Host actions in all states
- ✅ Player actions in all states
- ✅ Solo mode scenarios
- ✅ Text input mode scenarios
- ✅ Edge cases and validation
- ✅ Action descriptor structure

## Next Steps (Phase 2 & 3)

Now that the state machine is ready, you can:

1. **Create ActionButton Component** - Reusable component that renders action descriptors
2. **Refactor Host Components** - Use `useGameActions()` hook
3. **Refactor Player Components** - Replace conditional rendering with action-based approach
4. **Integrate with Supabase Migration** - Update action handlers to use new RPC functions

## Files Modified

- ✅ `lib/game/state-machine.ts` - Enhanced with action system
- ✅ `lib/game/state-machine.test.ts` - Comprehensive test suite
- ✅ `package.json` - Added test scripts
- ✅ Added Vitest as dev dependency

## Summary

The state machine is now **action-based** and **role-aware**. Components can query "what can I do right now?" instead of manually checking conditions. This makes the UI simpler, more accessible, and easier to maintain.
