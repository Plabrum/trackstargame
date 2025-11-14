/**
 * Supabase Realtime broadcasting utilities (server-side only).
 *
 * Handles broadcasting game events to all connected clients.
 * This module should only be imported in API routes or server components.
 */

import { createClient } from '@/lib/supabase/server';
import type { GameEvent } from './realtime-types';
import { getGameChannelName } from './realtime-types';

// Re-export types and helpers for convenience
export type { GameEvent };
export { getGameChannelName };

/**
 * Broadcast an event to all clients subscribed to a game session.
 *
 * @param sessionId - The game session ID
 * @param event - The event to broadcast
 */
export async function broadcastGameEvent(
  sessionId: string,
  event: GameEvent
): Promise<void> {
  const supabase = await createClient();

  const channelName = getGameChannelName(sessionId);
  const channel = supabase.channel(channelName);

  // Subscribe to the channel first
  await channel.subscribe();

  // Send the broadcast event
  await channel.send({
    type: 'broadcast',
    event: event.type,
    payload: event,
  });

  // Unsubscribe after sending
  await supabase.removeChannel(channel);
}

/**
 * Broadcast a state change to all clients.
 */
export async function broadcastStateChange(
  sessionId: string,
  newState: string
): Promise<void> {
  await broadcastGameEvent(sessionId, {
    type: 'state_change',
    newState,
  });
}
