import { useState, useEffect } from 'react';

/**
 * Hook to manage player identity with localStorage persistence
 * @param sessionId - The game session ID
 * @returns Player ID state and setter function
 */
export function usePlayerIdentity(sessionId: string) {
  const [playerId, setPlayerId] = useState<string | null>(null);

  // Load player ID from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`player_${sessionId}`);
    if (stored) {
      setPlayerId(stored);
    }
  }, [sessionId]);

  // Wrapper to set player ID and persist to localStorage
  const persistPlayerId = (id: string) => {
    setPlayerId(id);
    localStorage.setItem(`player_${sessionId}`, id);
  };

  return {
    playerId,
    setPlayerId: persistPlayerId,
  };
}
