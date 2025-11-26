# Exhaustive State Checking

This codebase uses TypeScript's exhaustive checking to ensure all game states are explicitly handled.

## How It Works

Both host and player pages use a `switch` statement with `assertUnreachable()` in the default case:

```typescript
const renderGameState = (): React.ReactNode => {
  const state: GameState = session.state as GameState;

  switch (state) {
    case 'lobby':
      return <LobbyView />;

    case 'playing':
    case 'buzzed':
    case 'submitted':
    case 'reveal':
      return <ActiveGameView />;

    case 'finished':
      return <FinalScoreView />;

    default:
      // TypeScript will error if any GameState case is missing above
      return assertUnreachable(state);
  }
};
```

## Benefits

### 1. Compile-Time Safety
If you add a new state to `GameState` type but forget to handle it in a component:

```typescript
// In state-machine.ts
export type GameState = 'lobby' | 'playing' | 'buzzed' | 'submitted' | 'reveal' | 'finished' | 'paused'; // Added 'paused'
```

TypeScript will immediately error at the `assertUnreachable(state)` line:
```
Error: Argument of type '"paused"' is not assignable to parameter of type 'never'.
```

### 2. Forces Explicit Handling
No more implicit fallthrough or forgotten states. Every state must be explicitly handled or grouped with similar states.

### 3. Refactoring Safety
When refactoring state logic, TypeScript guides you to every location that needs updating.

## Usage Pattern

### Single State Handling
```typescript
switch (state) {
  case 'lobby':
    return <Lobby />;

  case 'playing':
    return <Game />;

  default:
    return assertUnreachable(state);
}
```

### Grouped States
```typescript
switch (state) {
  case 'playing':
  case 'buzzed':
  case 'reveal':
    // These states share the same UI
    return <ActiveGame state={state} />;

  default:
    return assertUnreachable(state);
}
```

## Testing Exhaustiveness

You can test that exhaustiveness checking works:

```bash
# This should show a type error for missing 'finished' case
cat > /tmp/test.ts << 'EOF'
function test(state: GameState) {
  switch (state) {
    case 'lobby': return 'lobby';
    case 'playing': return 'playing';
    // Missing: 'buzzed', 'submitted', 'reveal', 'finished'
    default: return assertUnreachable(state); // ← Type error!
  }
}
EOF
npx tsc --noEmit /tmp/test.ts
```

## Related Files

- `/lib/utils/exhaustive-check.ts` - Utility functions
- `/lib/game/state-machine.ts` - GameState type definition
- `/app/(game)/host/[id]/page.tsx` - Host page with exhaustive checking
- `/app/(game)/play/[id]/page.tsx` - Player page with exhaustive checking
