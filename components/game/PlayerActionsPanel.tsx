/**
 * Player Actions Panel
 *
 * Action-based control panel for player game controls.
 * Uses the state machine to determine which actions are available.
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, Send } from "lucide-react";
import { usePlayerActions } from "@/hooks/useGameActions";
import type { PlayerAction } from "@/lib/game/state-machine";
import type { Tables } from "@/lib/types/database";

type GameSession = Tables<'game_sessions'>;
type Player = Tables<'players'>;
type GameRound = Tables<'game_rounds'>;

interface PlayerActionsPanelProps {
  session: GameSession;
  players: Player[];
  playerId: string;
  currentRound?: GameRound | null;

  // Action handlers
  onBuzz: () => void;
  onSubmitAnswer: (answer: string) => void;

  // Loading states
  isBuzzing?: boolean;
  isSubmittingAnswer?: boolean;
  hasSubmittedAnswer?: boolean;
}

export function PlayerActionsPanel({
  session,
  players,
  playerId,
  currentRound,
  onBuzz,
  onSubmitAnswer,
  isBuzzing,
  isSubmittingAnswer,
  hasSubmittedAnswer,
}: PlayerActionsPanelProps) {
  // Get available actions from state machine
  const actions = usePlayerActions(session, players, playerId, currentRound);

  // Answer input state (for text input mode)
  const [answer, setAnswer] = useState('');

  // Handle action execution
  const handleAction = (action: PlayerAction) => {
    switch (action.type) {
      case 'buzz':
        onBuzz();
        break;

      case 'submit_answer':
        // This is handled by the form submission
        break;

      case 'join_session':
        // This shouldn't happen in PlayerGameView (only in lobby)
        break;
    }
  };

  // Find the buzz action
  const buzzAction = actions.find((a) => a.action.type === 'buzz');

  // Find the submit answer action
  const submitAnswerAction = actions.find((a) => a.action.type === 'submit_answer');

  // If no actions available, show nothing
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Buzz Button */}
      {buzzAction && (
        <Button
          size="lg"
          className="w-full h-32 text-3xl font-bold bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-95 transition-transform"
          onClick={() => handleAction(buzzAction.action)}
          disabled={!buzzAction.enabled || isBuzzing}
          title={buzzAction.description}
        >
          {isBuzzing ? (
            "BUZZING..."
          ) : (
            <>
              <Zap className="h-10 w-10 mr-3" />
              {buzzAction.label}
            </>
          )}
        </Button>
      )}

      {/* Submit Answer Form (Text Input Mode) */}
      {submitAnswerAction && !hasSubmittedAnswer && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (answer.trim()) {
              onSubmitAnswer(answer.trim());
              setAnswer('');
            }
          }}
          className="space-y-3"
        >
          <Input
            type="text"
            placeholder="Enter artist/band name..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={!submitAnswerAction.enabled || isSubmittingAnswer}
            className="text-lg h-14"
            autoFocus
          />
          <Button
            type="submit"
            size="lg"
            className="w-full h-14 text-xl font-bold"
            disabled={!answer.trim() || !submitAnswerAction.enabled || isSubmittingAnswer}
            title={submitAnswerAction.description}
          >
            {isSubmittingAnswer ? (
              "SUBMITTING..."
            ) : (
              <>
                <Send className="h-6 w-6 mr-2" />
                {submitAnswerAction.label}
              </>
            )}
          </Button>
        </form>
      )}

      {/* Show disabled reason if applicable */}
      {buzzAction && !buzzAction.enabled && buzzAction.disabledReason && (
        <p className="text-sm text-muted-foreground text-center">
          {buzzAction.disabledReason}
        </p>
      )}
    </div>
  );
}
