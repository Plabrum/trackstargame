# TanStack Query Setup Guide

## ✅ What's Configured

TanStack Query (React Query) is now fully integrated into the trackstargame project for superior data fetching and state management.

### Files Created

```
lib/query/
├── client.ts                          # QueryClient configuration
└── provider.tsx                       # QueryProvider component

hooks/queries/
├── use-packs.ts                       # Pack and track queries
├── use-game.ts                        # Game session queries with real-time
└── README.md                          # Usage documentation

hooks/mutations/
└── use-game-mutations.ts              # Game actions (create, join, buzz, judge)

app/layout.tsx                         # Updated with QueryProvider
```

### Configuration Highlights

**QueryClient Settings** (`lib/query/client.ts`):
- **Stale Time**: 1 minute (how long data is considered "fresh")
- **Cache Time**: 5 minutes (how long inactive data stays in memory)
- **Retry**: 1 attempt with exponential backoff
- **Window Focus Refetch**: Disabled (we use Supabase Realtime instead)
- **Reconnect Refetch**: Enabled (refetch when coming back online)

**React Query Devtools**: Automatically included in development mode

## 🎯 Why TanStack Query?

### Problems It Solves

❌ **Without TanStack Query** (the old way):
```tsx
function GameView({ sessionId }) {
  const [session, setSession] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/session/${sessionId}`)
      .then(res => res.json())
      .then(data => {
        setSession(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });

    fetch(`/api/session/${sessionId}/players`)
      .then(res => res.json())
      .then(data => setPlayers(data));

    // Real-time subscription
    const channel = supabase
      .channel(`game:${sessionId}`)
      .on('postgres_changes', { ... }, () => {
        // Manually refetch everything...
        fetch(`/api/session/${sessionId}`)...
      })
      .subscribe();

    return () => channel.unsubscribe();
  }, [sessionId]);

  // More boilerplate...
}
```

✅ **With TanStack Query** (the new way):
```tsx
function GameView({ sessionId }) {
  const { data: session, isLoading, error } = useGameSession(sessionId);
  const { data: players } = useGamePlayers(sessionId);

  // That's it! Real-time updates, caching, loading states all handled.
}
```

### Key Benefits

1. **Less Boilerplate**: No more manual fetch, loading states, or error handling
2. **Automatic Caching**: Data is cached and shared across components
3. **Real-time Integration**: Queries auto-invalidate on Supabase Realtime events
4. **Loading States**: Built-in `isLoading`, `isPending`, `isFetching` states
5. **Error Handling**: Automatic retry with exponential backoff
6. **Developer Experience**: React Query Devtools for debugging
7. **Type Safety**: Full TypeScript support with our database types

## 📚 Usage Examples

### 1. Fetching Packs

```tsx
import { usePacks } from '@/hooks/queries/use-packs';

function PackSelector() {
  const { data: packs, isLoading, error } = usePacks();

  if (isLoading) return <div>Loading packs...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {packs?.map(pack => (
        <div key={pack.id}>
          <h3>{pack.name}</h3>
          <p>{pack.description}</p>
        </div>
      ))}
    </div>
  );
}
```

### 2. Real-time Game State

```tsx
import { useGameSession, useGamePlayers } from '@/hooks/queries/use-game';

function GameView({ sessionId }: { sessionId: string }) {
  // Automatically subscribes to real-time updates
  const { data: session } = useGameSession(sessionId);
  const { data: players } = useGamePlayers(sessionId);

  return (
    <div>
      <h1>Round {session?.current_round}/10</h1>
      <div>State: {session?.state}</div>

      <h2>Leaderboard</h2>
      {players?.map(player => (
        <div key={player.id}>
          {player.name}: {player.score} points
        </div>
      ))}
    </div>
  );
}
```

### 3. Creating a Game

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
          alert(`Failed to create game: ${error.message}`);
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

### 4. Joining a Game

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
          // Store player ID in localStorage for this session
          localStorage.setItem(`player_${sessionId}`, playerId);
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
        required
      />
      <button disabled={joinSession.isPending}>
        {joinSession.isPending ? 'Joining...' : 'Join Game'}
      </button>
      {joinSession.error && (
        <div className="error">{joinSession.error.message}</div>
      )}
    </form>
  );
}
```

### 5. Buzzing In

```tsx
import { useBuzz } from '@/hooks/mutations/use-game-mutations';

function BuzzButton({
  sessionId,
  playerId,
  disabled,
}: {
  sessionId: string;
  playerId: string;
  disabled: boolean;
}) {
  const buzz = useBuzz();

  return (
    <button
      onClick={() => buzz.mutate({ sessionId, playerId })}
      disabled={disabled || buzz.isPending}
      className="buzz-button"
    >
      {buzz.isPending ? 'BUZZING...' : 'BUZZ!'}
    </button>
  );
}
```

## 🔧 Advanced Patterns

### Optimistic Updates

```tsx
const judgement = useJudgeAnswer();

// Optimistically update UI before server confirms
judgement.mutate(
  { sessionId, correct: true },
  {
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['game_sessions', sessionId] });

      // Snapshot previous value
      const previousSession = queryClient.getQueryData(['game_sessions', sessionId]);

      // Optimistically update to the new value
      queryClient.setQueryData(['game_sessions', sessionId], (old) => ({
        ...old,
        state: 'reveal',
      }));

      // Return context with previous value
      return { previousSession };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(
        ['game_sessions', sessionId],
        context?.previousSession
      );
    },
    onSettled: () => {
      // Always refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: ['game_sessions', sessionId] });
    },
  }
);
```

### Dependent Queries

```tsx
// Only fetch tracks when we have a pack ID
function PackDetails({ packId }: { packId: string | null }) {
  const { data: pack } = usePack(packId);
  const { data: tracks } = usePackTracks(packId); // Only runs if packId is truthy

  if (!packId) return <div>No pack selected</div>;
  if (!pack) return <div>Loading...</div>;

  return (
    <div>
      <h1>{pack.name}</h1>
      <div>Tracks: {tracks?.length}</div>
    </div>
  );
}
```

## 🐛 Debugging with React Query Devtools

The React Query Devtools are automatically included in development mode. Access them by clicking the React Query logo in the bottom-right corner of your browser.

**Devtools Features**:
- View all queries and their states
- Inspect query data and errors
- Manually refetch or invalidate queries
- See mutation history
- Monitor cache behavior

## 📖 Next Steps

Now that TanStack Query is set up, you can:

1. **Build API Routes**: Create the actual API endpoints that the mutations call
2. **Implement Game Logic**: Use these hooks in your game components
3. **Add More Queries**: Create additional query hooks as needed
4. **Optimize Real-time**: Fine-tune real-time subscription patterns

## 🔗 Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [React Query in 100 Seconds](https://www.youtube.com/watch?v=novnyCaa7To)
- [Our Query Hooks README](./hooks/queries/README.md)
