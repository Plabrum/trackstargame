/**
 * Score Animation Component
 *
 * Displays a floating score change indicator (e.g., "+26.5" or "-10")
 * that animates upward and fades out.
 */

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ScoreAnimationProps {
  /** Score change amount (positive or negative) */
  score: number;
  /** Player ID to attach the animation to */
  playerId?: string;
  /** Trigger the animation */
  show: boolean;
}

export function ScoreAnimation({ score, playerId, show }: ScoreAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => setIsVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  const isPositive = score > 0;
  const color = isPositive ? "text-green-500" : "text-red-500";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={`score-${playerId}-${Date.now()}`}
          initial={{ opacity: 0, y: 0, scale: 0.5 }}
          animate={{ opacity: 1, y: -50, scale: 1 }}
          exit={{ opacity: 0, y: -80, scale: 0.8 }}
          transition={{
            duration: 1.5,
            ease: "easeOut",
          }}
          className={`absolute z-10 font-bold text-4xl ${color} drop-shadow-lg pointer-events-none`}
        >
          {isPositive ? '+' : ''}{score}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Animated Score Display
 *
 * Smoothly animates score changes using spring physics.
 */

interface AnimatedScoreProps {
  score: number;
  className?: string;
}

export function AnimatedScore({ score, className = "" }: AnimatedScoreProps) {
  return (
    <motion.span
      key={score}
      initial={{ scale: 1.5 }}
      animate={{ scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20
      }}
      className={`${className} text-green-500 transition-colors duration-500`}
    >
      {score}
    </motion.span>
  );
}
