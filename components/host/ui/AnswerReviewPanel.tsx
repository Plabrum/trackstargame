/**
 * Answer Review Panel
 * Shows submitted answers in text input mode with override controls
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import type { Tables } from "@/lib/types/database";

type Player = Tables<'players'>;
type RoundAnswer = Tables<'round_answers'>;

interface AnswerReviewPanelProps {
  submittedAnswers: RoundAnswer[];
  players: Player[];
  judgmentOverrides: Record<string, boolean>;
  onToggleOverride: (playerId: string, isCorrect: boolean) => void;
}

export function AnswerReviewPanel({
  submittedAnswers,
  players,
  judgmentOverrides,
  onToggleOverride,
}: AnswerReviewPanelProps) {
  if (submittedAnswers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {submittedAnswers.map((answer) => {
        const player = players.find(p => p.id === answer.player_id);
        const finalJudgment = judgmentOverrides[answer.player_id] ?? answer.auto_validated;

        return (
          <Card
            key={answer.id}
            className={`${finalJudgment
              ? 'border-green-300 bg-green-50'
              : 'border-red-300 bg-red-50'
              }`}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{player?.name}</p>
                  <p className="text-sm text-gray-700">
                    Answer: <span className="font-medium text-gray-900">{answer.submitted_answer}</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Auto-validated: {answer.auto_validated ? '✓ Correct' : '✗ Incorrect'}
                    {(answer.points_awarded ?? 0) > 0 && ` (+${answer.points_awarded} pts)`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={finalJudgment ? "default" : "outline"}
                    className={finalJudgment ? "bg-green-600 hover:bg-green-700" : ""}
                    onClick={() => onToggleOverride(answer.player_id, true)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={!finalJudgment ? "destructive" : "outline"}
                    onClick={() => onToggleOverride(answer.player_id, false)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
