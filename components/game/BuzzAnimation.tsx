/**
 * Buzz Animation Component
 *
 * Displays a full-screen flash animation when someone buzzes in.
 * Shows different colors for correct/incorrect answers.
 */

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BuzzAnimationProps {
  /** Trigger the animation */
  show: boolean;
  /** Player name who buzzed */
  playerName?: string;
  /** Whether the answer was correct (green) or incorrect (red) */
  isCorrect?: boolean | null;
  /** Duration in milliseconds */
  duration?: number;
}

export function BuzzAnimation({
  show,
  playerName,
  isCorrect = null,
  duration = 1000,
}: BuzzAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => setIsVisible(false), duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  // Color based on result
  const getBackgroundColor = () => {
    if (isCorrect === true) return "rgba(34, 197, 94, 0.3)"; // Green for correct
    if (isCorrect === false) return "rgba(239, 68, 68, 0.3)"; // Red for incorrect
    return "rgba(250, 204, 21, 0.3)"; // Yellow for buzz (no result yet)
  };

  const getBorderColor = () => {
    if (isCorrect === true) return "rgb(34, 197, 94)";
    if (isCorrect === false) return "rgb(239, 68, 68)";
    return "rgb(250, 204, 21)";
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          style={{
            backgroundColor: getBackgroundColor(),
          }}
        >
          {/* Animated border pulse */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: [0.8, 1.2, 1],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 0.6,
              times: [0, 0.5, 1],
              ease: "easeOut",
            }}
            className="absolute inset-0 border-8 rounded-xl"
            style={{
              borderColor: getBorderColor(),
            }}
          />

          {/* Center text */}
          {playerName && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <div className="text-6xl font-bold text-white drop-shadow-lg">
                {playerName}
              </div>
              <div className="text-3xl font-semibold text-white/90 mt-2">
                BUZZED IN!
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
