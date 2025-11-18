/**
 * Hook for subscribing to game channel broadcast events.
 *
 * Listens to all real-time events from the game session channel.
 */

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getGameChannelName, type GameEvent } from '@/lib/game/realtime-types';
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
    console.log('[useGameChannel] Subscribing to channel:', channelName);
    console.log('[useGameChannel] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true }, // Receive our own broadcasts for testing
      },
    });

    // Subscribe to all broadcast events
    channel
      .on('broadcast', { event: 'player_joined' }, ({ payload }) => {
        console.log('[useGameChannel] Received player_joined:', payload);
        handlersRef.current.onPlayerJoined?.(payload as Extract<GameEvent, { type: 'player_joined' }>);
      })
      .on('broadcast', { event: 'player_left' }, ({ payload }) => {
        console.log('[useGameChannel] Received player_left:', payload);
        handlersRef.current.onPlayerLeft?.(payload as Extract<GameEvent, { type: 'player_left' }>);
      })
      .on('broadcast', { event: 'game_started' }, ({ payload }) => {
        console.log('[useGameChannel] Received game_started:', payload);
        handlersRef.current.onGameStarted?.(payload as Extract<GameEvent, { type: 'game_started' }>);
      })
      .on('broadcast', { event: 'round_start' }, ({ payload }) => {
        console.log('[useGameChannel] Received round_start:', payload);
        handlersRef.current.onRoundStart?.(payload as Extract<GameEvent, { type: 'round_start' }>);
      })
      .on('broadcast', { event: 'buzz' }, ({ payload }) => {
        console.log('[useGameChannel] Received buzz:', payload);
        handlersRef.current.onBuzz?.(payload as Extract<GameEvent, { type: 'buzz' }>);
      })
      .on('broadcast', { event: 'round_result' }, ({ payload }) => {
        console.log('[useGameChannel] Received round_result:', payload);
        handlersRef.current.onRoundResult?.(payload as Extract<GameEvent, { type: 'round_result' }>);
      })
      .on('broadcast', { event: 'reveal' }, ({ payload }) => {
        console.log('[useGameChannel] Received reveal:', payload);
        handlersRef.current.onReveal?.(payload as Extract<GameEvent, { type: 'reveal' }>);
      })
      .on('broadcast', { event: 'state_change' }, ({ payload }) => {
        console.log('[useGameChannel] Received state_change:', payload);
        handlersRef.current.onStateChange?.(payload as Extract<GameEvent, { type: 'state_change' }>);
      })
      .on('broadcast', { event: 'game_end' }, ({ payload }) => {
        console.log('[useGameChannel] Received game_end:', payload);
        handlersRef.current.onGameEnd?.(payload as Extract<GameEvent, { type: 'game_end' }>);
      })
      .subscribe((status, err) => {
        console.log('[useGameChannel] Subscription status:', status, 'for channel:', channelName);
        if (err) {
          console.error('[useGameChannel] Subscription error:', err);
        }
        if (status === 'SUBSCRIBED') {
          console.log('[useGameChannel] Successfully subscribed to channel:', channelName);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[useGameChannel] Channel error for:', channelName);
        } else if (status === 'TIMED_OUT') {
          console.error('[useGameChannel] Subscription timed out for:', channelName);
        } else if (status === 'CLOSED') {
          console.log('[useGameChannel] Channel closed:', channelName);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('[useGameChannel] Unsubscribing from channel:', channelName);
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [sessionId]);

  return channelRef.current;
}
