/**
 * Buzzer Mode State Machine
 *
 * Traditional trivia gameplay where players buzz in to answer.
 * Flow: playing → buzzed → reveal → next round
 */

import type { GameStateMachine, GameState, Role, GameContext, ActionDescriptor } from './base';
import { GAME_CONFIG } from '../state-machine';

export class BuzzerModeStateMachine implements GameStateMachine {
  getMode() {
    return 'buzzer' as const;
  }

  getStateTransitions(): Record<GameState, GameState[]> {
    return {
      lobby: ['playing', 'finished'],
      playing: ['buzzed', 'reveal', 'finished'], // buzzed or reveal (timeout)
      buzzed: ['reveal', 'finished'], // host judges
      submitted: [], // Not used in buzzer mode
      reveal: ['playing', 'finished'], // next round or game over
      finished: [],
    };
  }

  getAvailableActions(state: GameState, role: Role, context: GameContext): ActionDescriptor[] {
    const actions: ActionDescriptor[] = [];

    if (role === 'host') {
      switch (state) {
        case 'lobby':
          const minPlayers = context.allowHostToPlay ? 0 : GAME_CONFIG.MIN_PLAYERS;
          const canStart = context.playerCount >= minPlayers && context.playerCount <= GAME_CONFIG.MAX_PLAYERS;

          actions.push({
            action: { type: 'start_game' },
            label: 'Start Game',
            description: `Begin the game with ${context.playerCount} player(s)`,
            enabled: canStart,
            disabledReason: canStart
              ? undefined
              : context.playerCount < minPlayers
                ? `Need at least ${minPlayers} player(s) to start`
                : `Maximum ${GAME_CONFIG.MAX_PLAYERS} players allowed`,
            variant: 'primary',
          });

          actions.push({
            action: { type: 'update_settings', settings: {} },
            label: 'Game Settings',
            description: 'Configure game options',
            enabled: true,
            variant: 'secondary',
          });

          actions.push({
            action: { type: 'end_game' },
            label: 'Cancel Game',
            description: 'End the game without starting',
            enabled: true,
            variant: 'danger',
          });
          break;

        case 'playing':
          actions.push({
            action: { type: 'reveal_answer' },
            label: 'Reveal Answer',
            description: 'Show answer if time expires or no one buzzes',
            enabled: true,
            variant: 'secondary',
          });

          actions.push({
            action: { type: 'end_game' },
            label: 'End Game',
            description: 'Stop the game early',
            enabled: true,
            variant: 'danger',
          });
          break;

        case 'buzzed':
          actions.push({
            action: { type: 'judge_answer', correct: true },
            label: 'Correct ✓',
            description: 'Award points to the buzzer',
            enabled: true,
            variant: 'primary',
          });

          actions.push({
            action: { type: 'judge_answer', correct: false },
            label: 'Incorrect ✗',
            description: 'Deduct points from the buzzer',
            enabled: true,
            variant: 'danger',
          });

          actions.push({
            action: { type: 'end_game' },
            label: 'End Game',
            description: 'Stop the game early',
            enabled: true,
            variant: 'danger',
          });
          break;

        case 'reveal':
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
          break;
      }
    }

    if (role === 'player') {
      switch (state) {
        case 'lobby':
          if (!context.hasJoined) {
            actions.push({
              action: { type: 'join_session', playerName: '' },
              label: 'Join Game',
              description: 'Enter your name and join the game',
              enabled: context.playerCount < GAME_CONFIG.MAX_PLAYERS,
              disabledReason: context.playerCount >= GAME_CONFIG.MAX_PLAYERS
                ? 'Game is full'
                : undefined,
              variant: 'primary',
            });
          }
          break;

        case 'playing':
          const alreadyBuzzed = context.hasPlayerBuzzed ?? false;
          actions.push({
            action: { type: 'buzz' },
            label: 'Buzz In',
            description: 'Signal that you know the answer',
            enabled: !alreadyBuzzed,
            disabledReason: alreadyBuzzed ? 'Someone already buzzed' : undefined,
            variant: 'primary',
          });
          break;

        case 'buzzed':
        case 'reveal':
        case 'finished':
          // No actions - players watch
          break;
      }
    }

    return actions;
  }

  getNextState(
    currentState: GameState,
    action: string,
    params?: { currentRound?: number; nextRound?: number; totalRounds?: number }
  ): GameState {
    switch (action) {
      case 'start':
        if (currentState === 'lobby') return 'playing';
        break;

      case 'buzz':
        if (currentState === 'playing') return 'buzzed';
        break;

      case 'judge':
      case 'reveal':
        if (currentState === 'buzzed' || currentState === 'playing') return 'reveal';
        break;

      case 'next_round':
        if (currentState === 'reveal') {
          const nextRoundNumber = params?.nextRound ?? (params?.currentRound ?? 0) + 1;
          const totalRounds = params?.totalRounds ?? GAME_CONFIG.TOTAL_ROUNDS;
          if (nextRoundNumber > totalRounds) {
            return 'finished';
          }
          return 'playing';
        }
        break;

      case 'finish':
        return 'finished';
    }

    return currentState;
  }
}
