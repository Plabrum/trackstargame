/**
 * Custom fetch wrapper for Orval-generated client
 *
 * Handles authentication, base URL, and error formatting.
 * Wraps responses in the format orval expects: { data, status, headers }
 */

export type ErrorType<Error> = Error;

export const customFetch = <T>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const requestInit: RequestInit = options;
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

    const data = await response.json();

    // Wrap response in orval's expected format
    return {
      data,
      status: response.status,
      headers: response.headers,
    } as T;
  });
};
