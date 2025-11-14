/**
 * Hook for subscribing to game channel broadcast events.
 *
 * Listens to all real-time events from the game session channel.
 */

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getGameChannelName, type GameEvent } from '@/lib/game/realtime';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type GameEventHandlers = {
  onPlayerJoined?: (event: Extract<GameEvent, { type: 'player_joined' }>) => void;
  onPlayerLeft?: (event: Extract<GameEvent, { type: 'player_left' }>) => void;
  onGameStarted?: (event: Extract<GameEvent, { type: 'game_started' }>) => void;
  onRoundStart?: (event: Extract<GameEvent, { type: 'round_start' }>) => void;
  onBuzz?: (event: Extract<GameEvent, { type: 'buzz' }>) => void;
  onRoundResult?: (event: Extract<GameEvent, { type: 'round_result' }>) => void;
  onReveal?: (event: Extract<GameEvent, { type: 'reveal' }>) => void;
  onStateChange?: (event: Extract<GameEvent, { type: 'state_change' }>) => void;
  onGameEnd?: (event: Extract<GameEvent, { type: 'game_end' }>) => void;
};

/**
 * Subscribe to game channel broadcast events.
 *
 * @param sessionId - The game session ID
 * @param handlers - Event handlers for different event types
 * @returns Channel instance (for debugging/status)
 */
export function useGameChannel(
  sessionId: string | null,
  handlers: GameEventHandlers
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const handlersRef = useRef(handlers);

  // Keep handlers ref up to date
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!sessionId) return;

    const supabase = createClient();
    const channelName = getGameChannelName(sessionId);
    const channel = supabase.channel(channelName);

    // Subscribe to all broadcast events
    channel
      .on('broadcast', { event: 'player_joined' }, ({ payload }) => {
        handlersRef.current.onPlayerJoined?.(payload as Extract<GameEvent, { type: 'player_joined' }>);
      })
      .on('broadcast', { event: 'player_left' }, ({ payload }) => {
        handlersRef.current.onPlayerLeft?.(payload as Extract<GameEvent, { type: 'player_left' }>);
      })
      .on('broadcast', { event: 'game_started' }, ({ payload }) => {
        handlersRef.current.onGameStarted?.(payload as Extract<GameEvent, { type: 'game_started' }>);
      })
      .on('broadcast', { event: 'round_start' }, ({ payload }) => {
        handlersRef.current.onRoundStart?.(payload as Extract<GameEvent, { type: 'round_start' }>);
      })
      .on('broadcast', { event: 'buzz' }, ({ payload }) => {
        handlersRef.current.onBuzz?.(payload as Extract<GameEvent, { type: 'buzz' }>);
      })
      .on('broadcast', { event: 'round_result' }, ({ payload }) => {
        handlersRef.current.onRoundResult?.(payload as Extract<GameEvent, { type: 'round_result' }>);
      })
      .on('broadcast', { event: 'reveal' }, ({ payload }) => {
        handlersRef.current.onReveal?.(payload as Extract<GameEvent, { type: 'reveal' }>);
      })
      .on('broadcast', { event: 'state_change' }, ({ payload }) => {
        handlersRef.current.onStateChange?.(payload as Extract<GameEvent, { type: 'state_change' }>);
      })
      .on('broadcast', { event: 'game_end' }, ({ payload }) => {
        handlersRef.current.onGameEnd?.(payload as Extract<GameEvent, { type: 'game_end' }>);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [sessionId]);

  return channelRef.current;
}
