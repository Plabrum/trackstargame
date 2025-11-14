# TanStack Query Hooks

This directory contains all React Query hooks for data fetching and mutations.

## Structure

```
hooks/
├── queries/           # Query hooks (data fetching)
│   ├── use-packs.ts   # Pack and track queries
│   ├── use-game.ts    # Game session, players, rounds
│   └── README.md      # This file
└── mutations/         # Mutation hooks (data modification)
    └── use-game-mutations.ts  # Create, join, buzz, judge
```

## Usage Examples

### Fetching Packs

```tsx
import { usePacks } from '@/hooks/queries/use-packs';

function PackSelector() {
  const { data: packs, isLoading, error } = usePacks();

  if (isLoading) return <div>Loading packs...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {packs?.map(pack => (
        <div key={pack.id}>{pack.name}</div>
      ))}
    </div>
  );
}
```

### Fetching Game State with Real-time Updates

```tsx
import { useGameSession, useGamePlayers } from '@/hooks/queries/use-game';

function GameView({ sessionId }: { sessionId: string }) {
  const { data: session } = useGameSession(sessionId);
  const { data: players } = useGamePlayers(sessionId);

  // Automatically updates when Supabase Realtime broadcasts changes
  return (
    <div>
      <h1>Round {session?.current_round}/10</h1>
      <div>State: {session?.state}</div>
      <h2>Players</h2>
      {players?.map(player => (
        <div key={player.id}>
          {player.name}: {player.score} points
        </div>
      ))}
    </div>
  );
}
```

### Creating a Game Session

```tsx
import { useCreateSession } from '@/hooks/mutations/use-game-mutations';
import { useRouter } from 'next/navigation';

function CreateGameButton({ packId }: { packId: string }) {
  const router = useRouter();
  const createSession = useCreateSession();

  const handleCreate = () => {
    createSession.mutate(
      { hostName: 'Alice', packId },
      {
        onSuccess: (sessionId) => {
          router.push(`/host/${sessionId}`);
        },
        onError: (error) => {
          console.error('Failed to create session:', error);
        },
      }
    );
  };

  return (
    <button
      onClick={handleCreate}
      disabled={createSession.isPending}
    >
      {createSession.isPending ? 'Creating...' : 'Create Game'}
    </button>
  );
}
```

### Joining a Game

```tsx
import { useJoinSession } from '@/hooks/mutations/use-game-mutations';

function JoinGameForm({ sessionId }: { sessionId: string }) {
  const [name, setName] = useState('');
  const joinSession = useJoinSession();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    joinSession.mutate(
      { sessionId, playerName: name },
      {
        onSuccess: (playerId) => {
          // Store playerId in localStorage or state
          console.log('Joined as player:', playerId);
        },
      }
    );
  };

  return (
    <form onSubmit={handleJoin}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
      />
      <button disabled={joinSession.isPending}>
        {joinSession.isPending ? 'Joining...' : 'Join Game'}
      </button>
      {joinSession.error && <div>Error: {joinSession.error.message}</div>}
    </form>
  );
}
```

### Buzzing In

```tsx
import { useBuzz } from '@/hooks/mutations/use-game-mutations';

function BuzzButton({ sessionId, playerId }: { sessionId: string; playerId: string }) {
  const buzz = useBuzz();

  return (
    <button
      onClick={() => buzz.mutate({ sessionId, playerId })}
      disabled={buzz.isPending}
      className="buzz-button"
    >
      {buzz.isPending ? 'Buzzing...' : 'BUZZ!'}
    </button>
  );
}
```

## Benefits of TanStack Query

1. **Automatic Caching**: Data is cached and reused across components
2. **Real-time Updates**: Integrated with Supabase Realtime for live data
3. **Loading States**: Built-in `isLoading`, `isPending`, `isError` states
4. **Error Handling**: Automatic retry logic and error management
5. **Optimistic Updates**: Update UI before server confirms (optional)
6. **Devtools**: React Query Devtools for debugging (in development)
7. **No useEffect**: Cleaner code without manual fetch in useEffect

## Query Keys Convention

All query keys follow this pattern:

```typescript
['resource', id?, 'subresource?']
```

Examples:
- `['packs']` - All packs
- `['packs', packId]` - Single pack
- `['packs', packId, 'tracks']` - Tracks for a pack
- `['game_sessions', sessionId]` - Game session
- `['game_sessions', sessionId, 'players']` - Players in session
- `['game_sessions', sessionId, 'rounds']` - Rounds in session

This convention makes invalidation predictable:

```typescript
// Invalidate all game-related queries for a session
queryClient.invalidateQueries({ queryKey: ['game_sessions', sessionId] });

// Invalidate only players
queryClient.invalidateQueries({ queryKey: ['game_sessions', sessionId, 'players'] });
```
