/**
 * Translates PostgreSQL error messages to user-friendly strings
 */
export function translateDBError(error: Error | { message: string }): string {
  const message = typeof error === 'string' ? error : error.message;

  // Custom error codes from RPC functions
  const errorMap: Record<string, string> = {
    'Game can only be started from lobby state': 'Game has already started',
    'Need at least 2 players': 'Need at least 2 players to start',
    'Can only buzz in playing state': 'Cannot buzz right now',
    'Can only judge in buzzed state': 'No one has buzzed yet',
    'Can only advance from reveal state': 'Must reveal answer first',
    'No more unused tracks available': 'Not enough tracks in pack',
    'Text input mode not enabled': 'Text input mode is disabled',
    'Already submitted an answer': 'You already submitted an answer',
    'Can only finalize in submitted state': 'Waiting for all answers',
  };

  // Check for known error messages
  for (const [dbMsg, friendlyMsg] of Object.entries(errorMap)) {
    if (message.includes(dbMsg)) {
      return friendlyMsg;
    }
  }

  // Handle constraint violations
  if (message.includes('unique') || message.includes('duplicate')) {
    if (message.includes('player')) return 'Player name already taken';
    if (message.includes('buzzer')) return 'Someone already buzzed';
    return 'This action conflicts with existing data';
  }

  // Handle permission errors (RLS violations)
  if (message.includes('policy') || message.includes('permission')) {
    return 'You do not have permission to do that';
  }

  // Handle foreign key violations
  if (message.includes('foreign key')) {
    return 'Referenced item not found';
  }

  // Default fallback
  return message || 'An unexpected error occurred';
}
