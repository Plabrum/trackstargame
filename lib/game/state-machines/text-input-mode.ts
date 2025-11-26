/**
 * Text Input Mode State Machine
 *
 * All players submit text answers simultaneously.
 * Flow: playing → submitted → reveal → next round
 */

import type { GameStateMachine, GameState, Role, GameContext, ActionDescriptor } from './base';
import { GAME_CONFIG } from '../state-machine';

export class TextInputModeStateMachine implements GameStateMachine {
  getMode() {
    return 'text-input' as const;
  }

  getStateTransitions(): Record<GameState, GameState[]> {
    return {
      lobby: ['playing', 'finished'],
      playing: ['submitted', 'reveal', 'finished'], // submitted when all answer or reveal (timeout)
      buzzed: [], // Not used in text input mode
      submitted: ['reveal', 'finished'], // host finalizes judgments
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
            description: 'Show answer if time expires',
            enabled: true,
            variant: 'secondary',
          });
          break;

        case 'submitted':
          // All players have submitted - host finalizes judgments
          actions.push({
            action: { type: 'finalize_judgments', overrides: {} },
            label: 'Finalize Answers',
            description: 'Review and judge all submitted answers',
            enabled: context.allPlayersSubmitted ?? false,
            disabledReason: context.allPlayersSubmitted
              ? undefined
              : 'Waiting for all players to submit',
            variant: 'primary',
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
          // Players submit text answers
          const hasSubmitted = context.hasCurrentPlayerSubmitted ?? false;
          actions.push({
            action: { type: 'submit_answer', answer: '' },
            label: 'Submit Answer',
            description: 'Type your answer',
            enabled: !hasSubmitted,
            disabledReason: hasSubmitted ? 'You already submitted' : undefined,
            variant: 'primary',
          });
          break;

        case 'submitted':
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

      case 'submit':
        // All players submitted
        if (currentState === 'playing') return 'submitted';
        break;

      case 'finalize':
        // Host finalizes judgments
        if (currentState === 'submitted') return 'reveal';
        break;

      case 'reveal':
        // Timeout - reveal without all submissions
        if (currentState === 'playing') return 'reveal';
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
