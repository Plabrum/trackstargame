/**
 * Host Actions Panel
 *
 * Action-based control panel for host game controls.
 * Uses the state machine to determine which actions are available.
 */

"use client";

import { ActionButtonGroup } from "@/components/game/ActionButton";
import { useHostActions } from "@/hooks/useGameActions";
import type { HostAction, PlayerAction } from "@/lib/game/state-machine";
import type { Tables } from "@/lib/types/database";

type GameSession = Tables<'game_sessions'>;
type Player = Tables<'players'>;
type GameRound = Tables<'game_rounds'>;
type RoundAnswer = Tables<'round_answers'>;

interface HostActionsPanelProps {
  session: GameSession;
  players: Player[];
  currentRound?: GameRound | null;
  submittedAnswers?: RoundAnswer[];

  // Action handlers
  onStartGame: () => void;
  onJudgeAnswer: (correct: boolean) => void;
  onAdvanceRound: () => void;
  onRevealAnswer: () => void;
  onEndGame: () => void;
  onUpdateSettings: () => void;
  onFinalizeJudgments: (overrides?: Record<string, boolean>) => void;

  // Loading states
  isStartingGame?: boolean;
  isJudging?: boolean;
  isAdvancing?: boolean;
  isRevealing?: boolean;
  isEndingGame?: boolean;
  isFinalizing?: boolean;
}

export function HostActionsPanel({
  session,
  players,
  currentRound,
  submittedAnswers,
  onStartGame,
  onJudgeAnswer,
  onAdvanceRound,
  onRevealAnswer,
  onEndGame,
  onUpdateSettings,
  onFinalizeJudgments,
  isStartingGame,
  isJudging,
  isAdvancing,
  isRevealing,
  isEndingGame,
  isFinalizing,
}: HostActionsPanelProps) {
  // Get available actions from state machine
  const actions = useHostActions(session, players, currentRound, submittedAnswers);

  // Determine which action is currently loading
  const getLoadingAction = (): string | undefined => {
    if (isStartingGame) return 'start_game';
    if (isJudging) return 'judge_answer';
    if (isAdvancing) return 'advance_round';
    if (isRevealing) return 'reveal_answer';
    if (isEndingGame) return 'end_game';
    if (isFinalizing) return 'finalize_judgments';
    return undefined;
  };

  // Handle action execution
  const handleAction = (action: HostAction | PlayerAction) => {
    // Type guard to ensure it's a HostAction
    if (!('type' in action) || !['start_game', 'judge_answer', 'advance_round', 'reveal_answer', 'end_game', 'update_settings', 'finalize_judgments'].includes(action.type)) {
      return; // Ignore player actions
    }

    const hostAction = action as HostAction;

    switch (hostAction.type) {
      case 'start_game':
        onStartGame();
        break;

      case 'judge_answer':
        onJudgeAnswer(hostAction.correct);
        break;

      case 'advance_round':
        onAdvanceRound();
        break;

      case 'reveal_answer':
        onRevealAnswer();
        break;

      case 'end_game':
        onEndGame();
        break;

      case 'update_settings':
        onUpdateSettings();
        break;

      case 'finalize_judgments':
        onFinalizeJudgments(hostAction.overrides);
        break;
    }
  };

  // Group actions by category for better UX
  const primaryActions = actions.filter(a => a.variant === 'primary');
  const secondaryActions = actions.filter(a => a.variant === 'secondary');
  const dangerActions = actions.filter(a => a.variant === 'danger');

  return (
    <div className="space-y-4">
      {/* Primary Actions */}
      {primaryActions.length > 0 && (
        <ActionButtonGroup
          actions={primaryActions}
          onAction={handleAction}
          loadingAction={getLoadingAction()}
          layout="grid"
          columns={2}
          size="lg"
          showDisabledReasons={true}
        />
      )}

      {/* Secondary Actions */}
      {secondaryActions.length > 0 && (
        <ActionButtonGroup
          actions={secondaryActions}
          onAction={handleAction}
          loadingAction={getLoadingAction()}
          layout="flex"
          size="default"
          showDisabledReasons={false}
        />
      )}

      {/* Danger Actions */}
      {dangerActions.length > 0 && (
        <ActionButtonGroup
          actions={dangerActions}
          onAction={handleAction}
          loadingAction={getLoadingAction()}
          layout="flex"
          size="default"
          showDisabledReasons={false}
        />
      )}
    </div>
  );
}
