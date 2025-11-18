# Enhanced State Machine Proposal

## Core Concept

**Given the current game state, present actors (host/player) with a set of available actions.**

All game logic is encoded in the state machine, making it:
- ✅ **Self-documenting** - State machine shows what's possible at any moment
- ✅ **Type-safe** - Actions are defined per state with proper types
- ✅ **Centralized** - Single source of truth for game rules
- ✅ **UI-agnostic** - Components just render available actions

---

## State Machine Definition

### States with Role-Based Actions

```typescript
type GameState = 'lobby' | 'playing' | 'buzzed' | 'submitted' | 'reveal' | 'finished';

type Role = 'host' | 'player';

type HostAction =
  | { type: 'start_game' }
  | { type: 'judge_answer'; correct: boolean }
  | { type: 'finalize_judgments'; overrides?: Record<string, boolean> }
  | { type: 'advance_round' }
  | { type: 'end_game' }
  | { type: 'update_settings'; settings: GameSettings }
  | { type: 'reveal_answer' }; // For timeout case

type PlayerAction =
  | { type: 'join_session'; playerName: string }
  | { type: 'buzz' }
  | { type: 'submit_answer'; answer: string };

type ActionDescriptor<T> = {
  action: T;
  label: string;
  description: string;
  enabled: boolean;
  disabledReason?: string;
  variant?: 'primary' | 'secondary' | 'danger';
};
```

### State → Actions Mapping

```typescript
export function getAvailableActions(
  state: GameState,
  role: Role,
  context: GameContext
): ActionDescriptor<HostAction | PlayerAction>[] {

  const actions: ActionDescriptor<any>[] = [];

  // Host Actions
  if (role === 'host') {
    switch (state) {
      case 'lobby':
        // Start game action
        const canStart = context.playerCount >= (context.allowSingleUser ? 0 : 2);
        actions.push({
          action: { type: 'start_game' },
          label: 'Start Game',
          description: `Begin the game with ${context.playerCount} player(s)`,
          enabled: canStart,
          disabledReason: canStart ? undefined : 'Need at least 2 players',
          variant: 'primary',
        });

        // Update settings action (only in lobby)
        actions.push({
          action: { type: 'update_settings' },
          label: 'Game Settings',
          description: 'Configure game options',
          enabled: true,
          variant: 'secondary',
        });

        // End game early action
        actions.push({
          action: { type: 'end_game' },
          label: 'Cancel Game',
          description: 'End the game without starting',
          enabled: true,
          variant: 'danger',
        });
        break;

      case 'playing':
        // Reveal answer (timeout case - no buzz)
        actions.push({
          action: { type: 'reveal_answer' },
          label: 'Reveal Answer',
          description: 'Show answer if no one buzzes',
          enabled: true,
          variant: 'secondary',
        });

        // End game action
        actions.push({
          action: { type: 'end_game' },
          label: 'End Game',
          description: 'Stop the game early',
          enabled: true,
          variant: 'danger',
        });
        break;

      case 'buzzed':
        // Judge correct
        actions.push({
          action: { type: 'judge_answer', correct: true },
          label: 'Correct ✓',
          description: 'Award points to the buzzer',
          enabled: true,
          variant: 'primary',
        });

        // Judge incorrect
        actions.push({
          action: { type: 'judge_answer', correct: false },
          label: 'Incorrect ✗',
          description: 'Deduct points from the buzzer',
          enabled: true,
          variant: 'danger',
        });
        break;

      case 'submitted':
        // Finalize judgments (after all players submit in text mode)
        actions.push({
          action: { type: 'finalize_judgments' },
          label: 'Finalize Answers',
          description: 'Review and judge all submitted answers',
          enabled: context.allPlayersSubmitted,
          disabledReason: context.allPlayersSubmitted
            ? undefined
            : 'Waiting for all players to submit',
          variant: 'primary',
        });
        break;

      case 'reveal':
        // Advance to next round
        const isLastRound = context.currentRound >= context.totalRounds;
        actions.push({
          action: { type: 'advance_round' },
          label: isLastRound ? 'Finish Game' : 'Next Round',
          description: isLastRound
            ? 'View final results'
            : `Proceed to round ${context.currentRound + 1}`,
          enabled: true,
          variant: 'primary',
        });
        break;

      case 'finished':
        // No actions in finished state (just display results)
        break;
    }
  }

  // Player Actions
  if (role === 'player') {
    switch (state) {
      case 'lobby':
        // Join session action (only if not already joined)
        if (!context.hasJoined) {
          actions.push({
            action: { type: 'join_session' },
            label: 'Join Game',
            description: 'Enter your name and join',
            enabled: true,
            variant: 'primary',
          });
        }
        break;

      case 'playing':
        // Buzz action
        const alreadyBuzzed = context.hasPlayerBuzzed;
        actions.push({
          action: { type: 'buzz' },
          label: 'Buzz In',
          description: 'Signal that you know the answer',
          enabled: !alreadyBuzzed,
          disabledReason: alreadyBuzzed ? 'Someone already buzzed' : undefined,
          variant: 'primary',
        });

        // Submit answer (if text input mode enabled)
        if (context.enableTextInputMode && !context.hasPlayerSubmitted) {
          actions.push({
            action: { type: 'submit_answer' },
            label: 'Submit Answer',
            description: 'Type your answer',
            enabled: true,
            variant: 'primary',
          });
        }
        break;

      case 'buzzed':
      case 'submitted':
      case 'reveal':
        // No actions for players in these states (just watch)
        break;

      case 'finished':
        // No actions (game over)
        break;
    }
  }

  return actions;
}
```

### Game Context Type

```typescript
type GameContext = {
  // Session info
  sessionId: string;
  state: GameState;
  currentRound: number;
  totalRounds: number;

  // Settings
  allowSingleUser: boolean;
  allowHostToPlay: boolean;
  enableTextInputMode: boolean;

  // Player info
  playerCount: number;
  hasJoined: boolean; // For current player
  hasPlayerBuzzed: boolean; // For current round
  hasPlayerSubmitted: boolean; // For current player in current round
  allPlayersSubmitted: boolean; // For all players in current round
};
```

---

## Integration with Supabase Migration

This approach **perfectly complements** the Supabase-native architecture:

### 1. RLS Policies Enforce State Constraints

```sql
-- RLS enforces state-level permissions
CREATE POLICY "Can buzz in playing state"
  ON game_rounds FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions
      WHERE id = session_id AND state = 'playing'
    )
  );
```

### 2. UI Derives Actions from State

```typescript
// Component example
export function HostGameController({ session, context }: Props) {
  const actions = getAvailableActions(session.state, 'host', context);

  return (
    <div className="actions-panel">
      {actions.map(({ action, label, description, enabled, disabledReason, variant }) => (
        <ActionButton
          key={action.type}
          action={action}
          label={label}
          description={description}
          enabled={enabled}
          disabledReason={disabledReason}
          variant={variant}
        />
      ))}
    </div>
  );
}
```

### 3. State Machine Validates Transitions

```typescript
// Before executing action, validate transition
export function executeAction(
  currentState: GameState,
  action: HostAction | PlayerAction,
  context: GameContext
): Promise<void> {
  // Get expected next state
  const nextState = getNextState(currentState, action.type);

  // Validate transition
  if (!isValidTransition(currentState, nextState)) {
    throw new Error(`Invalid transition: ${currentState} → ${nextState}`);
  }

  // Execute via Supabase (direct update or RPC)
  switch (action.type) {
    case 'buzz':
      return supabase
        .from('game_rounds')
        .update({ buzzer_player_id: context.playerId })
        .eq('session_id', context.sessionId)
        .is('buzzer_player_id', null);

    case 'start_game':
      return supabase.rpc('start_game', { p_session_id: context.sessionId });

    // ... other actions
  }
}
```

---

## Benefits of This Approach

### 1. **UI Simplification**
Components become dumb renderers of available actions:

```typescript
// Before (imperative)
{state === 'playing' && !hasPlayerBuzzed && (
  <button onClick={handleBuzz}>Buzz</button>
)}
{state === 'buzzed' && isHost && (
  <>
    <button onClick={() => handleJudge(true)}>Correct</button>
    <button onClick={() => handleJudge(false)}>Incorrect</button>
  </>
)}

// After (declarative)
{actions.map(action => (
  <ActionButton key={action.type} {...action} />
))}
```

### 2. **Accessibility**
Action descriptors include:
- Labels for screen readers
- Descriptions for tooltips
- Disabled reasons for feedback

### 3. **Testing**
State machine is pure logic (no React):

```typescript
test('host can start game with 2+ players', () => {
  const actions = getAvailableActions('lobby', 'host', {
    playerCount: 2,
    allowSingleUser: false,
    // ... other context
  });

  const startAction = actions.find(a => a.action.type === 'start_game');
  expect(startAction?.enabled).toBe(true);
});

test('host cannot start with 1 player (non-solo mode)', () => {
  const actions = getAvailableActions('lobby', 'host', {
    playerCount: 1,
    allowSingleUser: false,
    // ... other context
  });

  const startAction = actions.find(a => a.action.type === 'start_game');
  expect(startAction?.enabled).toBe(false);
  expect(startAction?.disabledReason).toBe('Need at least 2 players');
});
```

### 4. **Self-Documentation**
The state machine file becomes the **definitive game spec**:
- What states exist
- What actions are possible in each state
- What conditions enable/disable actions
- What the next state will be

### 5. **Type Safety**
TypeScript ensures:
- Actions match their state
- All required context is provided
- Action handlers are exhaustive

---

## Implementation Strategy

### Phase 1: Enhance State Machine (2 hours)
- Add `getAvailableActions()` function
- Add `GameContext` type
- Add `ActionDescriptor` type
- Write unit tests for action availability

### Phase 2: Create ActionButton Component (1 hour)
- Build reusable action button with:
  - Tooltip for description
  - Disabled state with reason
  - Loading state during mutation
  - Variant styling

### Phase 3: Update Host Components (2 hours)
- Refactor `HostGameController` to use action-based approach
- Remove conditional rendering logic
- Connect actions to existing mutation hooks

### Phase 4: Update Player Components (2 hours)
- Refactor player UI to use action-based approach
- Update buzz/submit flows

### Phase 5: Integration with Supabase Migration (concurrent)
- Can be done **in parallel** with deep Supabase migration
- State machine logic is independent of data layer
- Just need to update `executeAction()` to use new RPC functions

---

## Next Steps

Would you like me to:

1. **Start with Phase 1** - Implement the enhanced state machine with `getAvailableActions()`?
2. **Review the existing state machine** - Identify what needs to change for solo mode?
3. **Create a prototype** - Build the `ActionButton` component and refactor one view (host or player)?
4. **Proceed with Supabase migration** - Execute the deep migration plan first, then add action-based state machine?

The beauty of this approach is that **the state machine enhancement is orthogonal to the Supabase migration**. We can do either first, or both in parallel!
