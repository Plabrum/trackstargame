/**
 * AnswerInputForm Component
 *
 * Reusable form for submitting text answers.
 * Extracted from PlayerActionsPanel and HostGameView.
 */

"use client";

import { useState, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface AnswerInputFormProps {
  /** Callback when answer is submitted */
  onSubmit: (answer: string) => void;
  /** Whether submission is in progress */
  isSubmitting: boolean;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Input placeholder text */
  placeholder?: string;
  /** Submit button text */
  buttonText?: string;
  /** Whether to clear input after submission */
  clearOnSubmit?: boolean;
}

/**
 * AnswerInputForm component for text-based answer submission.
 *
 * Features:
 * - Auto-focus on mount
 * - Enter key to submit
 * - Disabled state handling
 * - Loading state display
 */
export function AnswerInputForm({
  onSubmit,
  isSubmitting,
  disabled = false,
  placeholder = "Enter artist/band name...",
  buttonText = "SUBMIT ANSWER",
  clearOnSubmit = true,
}: AnswerInputFormProps) {
  const [answer, setAnswer] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (answer.trim()) {
      onSubmit(answer.trim());
      if (clearOnSubmit) {
        setAnswer("");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        type="text"
        placeholder={placeholder}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={disabled || isSubmitting}
        className="text-lg h-14"
        autoFocus
      />
      <Button
        type="submit"
        size="lg"
        className="w-full h-14 text-xl font-bold"
        disabled={!answer.trim() || disabled || isSubmitting}
      >
        {isSubmitting ? (
          "SUBMITTING..."
        ) : (
          <>
            <Send className="h-6 w-6 mr-2" />
            {buttonText}
          </>
        )}
      </Button>
    </form>
  );
}
