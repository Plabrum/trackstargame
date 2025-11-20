/**
 * Unit tests for the game state machine.
 *
 * To run these tests, you'll need to install Vitest:
 * pnpm add -D vitest
 *
 * Then add to package.json scripts:
 * "test": "vitest",
 * "test:ui": "vitest --ui"
 *
 * Run with: pnpm test
 */

import { describe, it, expect } from 'vitest';
import {
  getAvailableActions,
  GameContext,
  GameState,
  Role,
  GAME_CONFIG,
} from './state-machine';

// Helper to create a basic game context
const createContext = (overrides: Partial<GameContext> = {}): GameContext => ({
  sessionId: 'test-session',
  state: 'lobby',
  currentRound: 1,
  totalRounds: 10,
  allowHostToPlay: false,
  enableTextInputMode: false,
  playerCount: 2,
  hasJoined: false,
  ...overrides,
});

describe('getAvailableActions', () => {
  describe('Host in Lobby State', () => {
    it('should allow host to start game with 2+ players (default mode)', () => {
      const context = createContext({ playerCount: 2 });
      const actions = getAvailableActions('lobby', 'host', context);

      const startAction = actions.find((a) => a.action.type === 'start_game');
      expect(startAction).toBeDefined();
      expect(startAction?.enabled).toBe(true);
      expect(startAction?.label).toBe('Start Game');
      expect(startAction?.variant).toBe('primary');
    });

    it('should disable start game with only 1 player (default mode)', () => {
      const context = createContext({ playerCount: 1 });
      const actions = getAvailableActions('lobby', 'host', context);

      const startAction = actions.find((a) => a.action.type === 'start_game');
      expect(startAction).toBeDefined();
      expect(startAction?.enabled).toBe(false);
      expect(startAction?.disabledReason).toContain('Need at least 2 player(s)');
    });

    it('should allow start game with 0 players in solo mode', () => {
      const context = createContext({
        playerCount: 0,
        allowHostToPlay: true,
      });
      const actions = getAvailableActions('lobby', 'host', context);

      const startAction = actions.find((a) => a.action.type === 'start_game');
      expect(startAction?.enabled).toBe(true);
    });

    it('should allow start game with 1 player when host can play', () => {
      const context = createContext({
        playerCount: 1,
        allowHostToPlay: true,
      });
      const actions = getAvailableActions('lobby', 'host', context);

      const startAction = actions.find((a) => a.action.type === 'start_game');
      expect(startAction?.enabled).toBe(true);
    });

    it('should disable start game when player count exceeds max', () => {
      const context = createContext({
        playerCount: GAME_CONFIG.MAX_PLAYERS + 1,
      });
      const actions = getAvailableActions('lobby', 'host', context);

      const startAction = actions.find((a) => a.action.type === 'start_game');
      expect(startAction?.enabled).toBe(false);
      expect(startAction?.disabledReason).toContain('Maximum');
    });

    it('should provide update settings action', () => {
      const context = createContext();
      const actions = getAvailableActions('lobby', 'host', context);

      const settingsAction = actions.find((a) => a.action.type === 'update_settings');
      expect(settingsAction).toBeDefined();
      expect(settingsAction?.enabled).toBe(true);
      expect(settingsAction?.label).toBe('Game Settings');
      expect(settingsAction?.variant).toBe('secondary');
    });

    it('should provide cancel game action', () => {
      const context = createContext();
      const actions = getAvailableActions('lobby', 'host', context);

      const endAction = actions.find((a) => a.action.type === 'end_game');
      expect(endAction).toBeDefined();
      expect(endAction?.enabled).toBe(true);
      expect(endAction?.label).toBe('Cancel Game');
      expect(endAction?.variant).toBe('danger');
    });

    it('should return exactly 3 actions in lobby', () => {
      const context = createContext();
      const actions = getAvailableActions('lobby', 'host', context);

      expect(actions).toHaveLength(3);
      expect(actions.map((a) => a.action.type)).toEqual([
        'start_game',
        'update_settings',
        'end_game',
      ]);
    });
  });

  describe('Host in Playing State', () => {
    it('should provide reveal answer action', () => {
      const context = createContext({ state: 'playing' });
      const actions = getAvailableActions('playing', 'host', context);

      const revealAction = actions.find((a) => a.action.type === 'reveal_answer');
      expect(revealAction).toBeDefined();
      expect(revealAction?.enabled).toBe(true);
      expect(revealAction?.label).toBe('Reveal Answer');
      expect(revealAction?.variant).toBe('secondary');
    });

    it('should provide end game action', () => {
      const context = createContext({ state: 'playing' });
      const actions = getAvailableActions('playing', 'host', context);

      const endAction = actions.find((a) => a.action.type === 'end_game');
      expect(endAction).toBeDefined();
      expect(endAction?.enabled).toBe(true);
    });

    it('should return exactly 2 actions in playing state', () => {
      const context = createContext({ state: 'playing' });
      const actions = getAvailableActions('playing', 'host', context);

      expect(actions).toHaveLength(2);
    });
  });

  describe('Host in Buzzed State', () => {
    it('should provide correct judgment action', () => {
      const context = createContext({ state: 'buzzed' });
      const actions = getAvailableActions('buzzed', 'host', context);

      const correctAction = actions.find(
        (a) => a.action.type === 'judge_answer' && a.action.correct === true
      );
      expect(correctAction).toBeDefined();
      expect(correctAction?.enabled).toBe(true);
      expect(correctAction?.label).toBe('Correct ✓');
      expect(correctAction?.variant).toBe('primary');
    });

    it('should provide incorrect judgment action', () => {
      const context = createContext({ state: 'buzzed' });
      const actions = getAvailableActions('buzzed', 'host', context);

      const incorrectAction = actions.find(
        (a) => a.action.type === 'judge_answer' && a.action.correct === false
      );
      expect(incorrectAction).toBeDefined();
      expect(incorrectAction?.enabled).toBe(true);
      expect(incorrectAction?.label).toBe('Incorrect ✗');
      expect(incorrectAction?.variant).toBe('danger');
    });

    it('should return exactly 3 actions in buzzed state', () => {
      const context = createContext({ state: 'buzzed' });
      const actions = getAvailableActions('buzzed', 'host', context);

      expect(actions).toHaveLength(3);
    });
  });

  describe('Host in Submitted State', () => {
    it('should enable finalize when all players submitted', () => {
      const context = createContext({
        state: 'submitted',
        allPlayersSubmitted: true,
      });
      const actions = getAvailableActions('submitted', 'host', context);

      const finalizeAction = actions.find((a) => a.action.type === 'finalize_judgments');
      expect(finalizeAction).toBeDefined();
      expect(finalizeAction?.enabled).toBe(true);
      expect(finalizeAction?.disabledReason).toBeUndefined();
    });

    it('should disable finalize when not all players submitted', () => {
      const context = createContext({
        state: 'submitted',
        allPlayersSubmitted: false,
      });
      const actions = getAvailableActions('submitted', 'host', context);

      const finalizeAction = actions.find((a) => a.action.type === 'finalize_judgments');
      expect(finalizeAction).toBeDefined();
      expect(finalizeAction?.enabled).toBe(false);
      expect(finalizeAction?.disabledReason).toBe('Waiting for all players to submit');
    });
  });

  describe('Host in Reveal State', () => {
    it('should show "Next Round" for non-final rounds', () => {
      const context = createContext({
        state: 'reveal',
        currentRound: 5,
        totalRounds: 10,
      });
      const actions = getAvailableActions('reveal', 'host', context);

      const advanceAction = actions.find((a) => a.action.type === 'advance_round');
      expect(advanceAction).toBeDefined();
      expect(advanceAction?.label).toBe('Next Round');
      expect(advanceAction?.description).toContain('Proceed to round 6');
    });

    it('should show "Finish Game" for final round', () => {
      const context = createContext({
        state: 'reveal',
        currentRound: 10,
        totalRounds: 10,
      });
      const actions = getAvailableActions('reveal', 'host', context);

      const advanceAction = actions.find((a) => a.action.type === 'advance_round');
      expect(advanceAction).toBeDefined();
      expect(advanceAction?.label).toBe('Finish Game');
      expect(advanceAction?.description).toContain('final results');
    });
  });

  describe('Host in Finished State', () => {
    it('should return no actions in finished state', () => {
      const context = createContext({ state: 'finished' });
      const actions = getAvailableActions('finished', 'host', context);

      expect(actions).toHaveLength(0);
    });
  });

  describe('Player in Lobby State', () => {
    it('should show join action when not joined', () => {
      const context = createContext({
        hasJoined: false,
        playerCount: 5,
      });
      const actions = getAvailableActions('lobby', 'player', context);

      const joinAction = actions.find((a) => a.action.type === 'join_session');
      expect(joinAction).toBeDefined();
      expect(joinAction?.enabled).toBe(true);
      expect(joinAction?.label).toBe('Join Game');
      expect(joinAction?.variant).toBe('primary');
    });

    it('should not show join action when already joined', () => {
      const context = createContext({ hasJoined: true });
      const actions = getAvailableActions('lobby', 'player', context);

      const joinAction = actions.find((a) => a.action.type === 'join_session');
      expect(joinAction).toBeUndefined();
      expect(actions).toHaveLength(0);
    });

    it('should disable join action when game is full', () => {
      const context = createContext({
        hasJoined: false,
        playerCount: GAME_CONFIG.MAX_PLAYERS,
      });
      const actions = getAvailableActions('lobby', 'player', context);

      const joinAction = actions.find((a) => a.action.type === 'join_session');
      expect(joinAction).toBeDefined();
      expect(joinAction?.enabled).toBe(false);
      expect(joinAction?.disabledReason).toBe('Game is full');
    });
  });

  describe('Player in Playing State', () => {
    it('should enable buzz when no one has buzzed', () => {
      const context = createContext({
        state: 'playing',
        hasPlayerBuzzed: false,
      });
      const actions = getAvailableActions('playing', 'player', context);

      const buzzAction = actions.find((a) => a.action.type === 'buzz');
      expect(buzzAction).toBeDefined();
      expect(buzzAction?.enabled).toBe(true);
      expect(buzzAction?.label).toBe('Buzz In');
      expect(buzzAction?.variant).toBe('primary');
    });

    it('should disable buzz when someone has buzzed', () => {
      const context = createContext({
        state: 'playing',
        hasPlayerBuzzed: true,
      });
      const actions = getAvailableActions('playing', 'player', context);

      const buzzAction = actions.find((a) => a.action.type === 'buzz');
      expect(buzzAction).toBeDefined();
      expect(buzzAction?.enabled).toBe(false);
      expect(buzzAction?.disabledReason).toBe('Someone already buzzed');
    });

    it('should show submit answer action when text input mode enabled', () => {
      const context = createContext({
        state: 'playing',
        enableTextInputMode: true,
        hasCurrentPlayerSubmitted: false,
      });
      const actions = getAvailableActions('playing', 'player', context);

      const submitAction = actions.find((a) => a.action.type === 'submit_answer');
      expect(submitAction).toBeDefined();
      expect(submitAction?.enabled).toBe(true);
      expect(submitAction?.label).toBe('Submit Answer');
    });

    it('should not show submit answer when text input mode disabled', () => {
      const context = createContext({
        state: 'playing',
        enableTextInputMode: false,
      });
      const actions = getAvailableActions('playing', 'player', context);

      const submitAction = actions.find((a) => a.action.type === 'submit_answer');
      expect(submitAction).toBeUndefined();
    });

    it('should disable submit answer when already submitted', () => {
      const context = createContext({
        state: 'playing',
        enableTextInputMode: true,
        hasCurrentPlayerSubmitted: true,
      });
      const actions = getAvailableActions('playing', 'player', context);

      const submitAction = actions.find((a) => a.action.type === 'submit_answer');
      expect(submitAction).toBeDefined();
      expect(submitAction?.enabled).toBe(false);
      expect(submitAction?.disabledReason).toBe('You already submitted');
    });

    it('should show both buzz and submit when text mode enabled and no buzz', () => {
      const context = createContext({
        state: 'playing',
        enableTextInputMode: true,
        hasPlayerBuzzed: false,
        hasCurrentPlayerSubmitted: false,
      });
      const actions = getAvailableActions('playing', 'player', context);

      expect(actions).toHaveLength(2);
      expect(actions.map((a) => a.action.type)).toEqual(['buzz', 'submit_answer']);
    });
  });

  describe('Player in Passive States', () => {
    const passiveStates: GameState[] = ['buzzed', 'submitted', 'reveal', 'finished'];

    passiveStates.forEach((state) => {
      it(`should return no actions in ${state} state`, () => {
        const context = createContext({ state });
        const actions = getAvailableActions(state, 'player', context);

        expect(actions).toHaveLength(0);
      });
    });
  });

  describe('Action Descriptors Structure', () => {
    it('should have all required fields in action descriptors', () => {
      const context = createContext({ state: 'lobby', playerCount: 2 });
      const actions = getAvailableActions('lobby', 'host', context);

      actions.forEach((descriptor) => {
        expect(descriptor).toHaveProperty('action');
        expect(descriptor).toHaveProperty('label');
        expect(descriptor).toHaveProperty('description');
        expect(descriptor).toHaveProperty('enabled');
        expect(descriptor).toHaveProperty('variant');
        expect(typeof descriptor.label).toBe('string');
        expect(typeof descriptor.description).toBe('string');
        expect(typeof descriptor.enabled).toBe('boolean');
      });
    });

    it('should include disabledReason when action is disabled', () => {
      const context = createContext({ state: 'lobby', playerCount: 1 });
      const actions = getAvailableActions('lobby', 'host', context);

      const startAction = actions.find((a) => a.action.type === 'start_game');
      expect(startAction?.enabled).toBe(false);
      expect(startAction?.disabledReason).toBeDefined();
      expect(typeof startAction?.disabledReason).toBe('string');
    });

    it('should not include disabledReason when action is enabled', () => {
      const context = createContext({ state: 'lobby', playerCount: 2 });
      const actions = getAvailableActions('lobby', 'host', context);

      const startAction = actions.find((a) => a.action.type === 'start_game');
      expect(startAction?.enabled).toBe(true);
      expect(startAction?.disabledReason).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional context fields gracefully', () => {
      const minimalContext: GameContext = {
        sessionId: 'test',
        state: 'playing',
        currentRound: 1,
        totalRounds: 10,
        allowHostToPlay: false,
        enableTextInputMode: false,
        playerCount: 2,
        hasJoined: true,
        // Missing optional fields: hasPlayerBuzzed, hasCurrentPlayerSubmitted, etc.
      };

      expect(() => {
        getAvailableActions('playing', 'player', minimalContext);
      }).not.toThrow();
    });

    it('should handle all game states without errors', () => {
      const states: GameState[] = ['lobby', 'playing', 'buzzed', 'submitted', 'reveal', 'finished'];
      const roles: Role[] = ['host', 'player'];

      states.forEach((state) => {
        roles.forEach((role) => {
          const context = createContext({ state });
          expect(() => {
            getAvailableActions(state, role, context);
          }).not.toThrow();
        });
      });
    });
  });
});
