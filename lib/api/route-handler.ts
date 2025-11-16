/**
 * API Route Handler Wrapper
 *
 * Eliminates repetitive try-catch and error handling boilerplate.
 * Provides full TypeScript type safety for requests and responses.
 * Integrates with Zod for runtime validation.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

type RouteContext<TParams = any> = {
  params: Promise<TParams>;
};

type RouteHandler<TResponse = any, TParams = any> = (
  request: Request,
  context: RouteContext<TParams>
) => Promise<TResponse> | TResponse;

/**
 * Wraps an API route handler with automatic error handling and type safety.
 *
 * @example
 * export const GET = apiHandler<PlayersAPI.ListResponse, { id: string }>(
 *   async (request, { params }) => {
 *     const { id } = await params;
 *     const players = await fetchPlayers(id);
 *     return players; // Type-checked!
 *   }
 * );
 */
export function apiHandler<TResponse = any, TParams = any>(
  handler: RouteHandler<TResponse, TParams>,
  options?: {
    /** Custom error message prefix */
    errorPrefix?: string;
    /** Whether to log errors (default: true) */
    logErrors?: boolean;
  }
) {
  return async (request: Request, context: RouteContext<TParams>) => {
    try {
      const result = await handler(request, context);

      // If handler already returned a Response, return it directly
      if (result instanceof Response) {
        return result;
      }

      // Otherwise wrap in JSON response
      return NextResponse.json(result);
    } catch (error) {
      const logErrors = options?.logErrors ?? true;
      const errorPrefix = options?.errorPrefix || 'API Error';

      if (logErrors) {
        console.error(`${errorPrefix}:`, error);
      }

      // Handle known error types
      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status }
        );
      }

      // Handle generic errors
      const message = error instanceof Error ? error.message : 'Internal server error';
      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }
  };
}

/**
 * Custom API Error class for throwing HTTP errors.
 *
 * @example
 * if (!session) {
 *   throw new ApiError('Session not found', 404);
 * }
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Validation Error - thrown when Zod validation fails
 */
export class ValidationError extends ApiError {
  constructor(
    public errors: z.ZodError
  ) {
    super('Validation failed', 400);
    this.name = 'ValidationError';
  }
}

/**
 * Parse and validate request body with Zod schema
 *
 * @example
 * const body = await parseBody(request, JoinSessionSchema);
 * // body is now validated and typed!
 */
export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  try {
    const rawBody = await request.json();
    return schema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format Zod errors nicely
      const firstError = error.issues[0];
      const message = firstError.message;
      const path = firstError.path.join('.');
      throw new ApiError(
        path ? `${path}: ${message}` : message,
        400
      );
    }
    throw error;
  }
}

/**
 * Parse and validate query parameters with Zod schema
 *
 * @example
 * const query = parseQuery(request, PackListQuerySchema);
 * // query is now validated and typed!
 */
export function parseQuery<T extends z.ZodType>(
  request: Request,
  schema: T
): z.infer<T> {
  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams.entries());

  try {
    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      const message = firstError.message;
      const path = firstError.path.join('.');
      throw new ApiError(
        path ? `Query param ${path}: ${message}` : message,
        400
      );
    }
    throw error;
  }
}

/**
 * Common API error factories
 */
export const ApiErrors = {
  notFound: (resource: string) =>
    new ApiError(`${resource} not found`, 404),

  badRequest: (message: string) =>
    new ApiError(message, 400),

  unauthorized: (message: string = 'Unauthorized') =>
    new ApiError(message, 401),

  forbidden: (message: string = 'Forbidden') =>
    new ApiError(message, 403),

  conflict: (message: string) =>
    new ApiError(message, 409),

  internal: (message: string = 'Internal server error') =>
    new ApiError(message, 500),
};
