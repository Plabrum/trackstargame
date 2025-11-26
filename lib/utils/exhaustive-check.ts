/**
 * Exhaustive Type Checking Utilities
 *
 * Provides type-safe exhaustiveness checking for switch statements and discriminated unions.
 * When used in the default case of a switch statement, TypeScript will error if any cases are missing.
 */

/**
 * Assert that all cases in a switch statement have been handled.
 *
 * Usage:
 * ```ts
 * switch (state) {
 *   case 'lobby': return <Lobby />;
 *   case 'playing': return <Game />;
 *   case 'finished': return <Results />;
 *   default: return assertUnreachable(state); // TypeScript error if cases missing
 * }
 * ```
 *
 * @param value - The value that should never be reached
 * @throws Error if called at runtime (indicates unhandled case)
 */
export function assertUnreachable(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

/**
 * Type guard to check if a value is exhaustively checked.
 * Returns true if all cases are handled, false with type error if not.
 *
 * Usage:
 * ```ts
 * type State = 'a' | 'b' | 'c';
 * const state: State = 'a';
 *
 * if (state === 'a') { }
 * else if (state === 'b') { }
 * else if (state === 'c') { }
 * else { assertExhaustive(state); } // TypeScript verifies all cases handled
 * ```
 */
export function assertExhaustive(_value: never): true {
  return true;
}
