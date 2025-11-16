/**
 * Custom fetch wrapper for Orval-generated client
 *
 * Handles authentication, base URL, and error formatting.
 */

export type ErrorType<Error> = Error;

export const customFetch = <T>(
  url: string,
  options: RequestInit | AbortSignal = {}
): Promise<T> => {
  // Handle when options is an AbortSignal (from react-query)
  const requestInit: RequestInit = options instanceof AbortSignal
    ? { signal: options }
    : options;
  // In browser, use relative URLs
  // In Expo, use full API URL from env
  const baseURL =
    typeof window !== 'undefined'
      ? ''
      : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  return fetch(`${baseURL}${url}`, {
    ...requestInit,
    headers: {
      'Content-Type': 'application/json',
      ...requestInit.headers,
    },
  }).then(async (response) => {
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }
    return response.json();
  });
};
