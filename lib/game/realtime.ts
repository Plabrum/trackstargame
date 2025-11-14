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

  // Use httpSend for REST API delivery (recommended approach)
  // This sends the message via REST without requiring a WebSocket subscription
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: channelName,
            event: event.type,
            payload: event,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to broadcast message: ${response.statusText}`);
  }
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
