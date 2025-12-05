import { useMutation } from '@tanstack/react-query';

/**
 * Hook to save a track to the user's Spotify library
 */
export function useSaveTrackToLibrary() {
  return useMutation({
    mutationFn: async (spotifyId: string) => {
      const response = await fetch('/api/spotify/save-track', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trackId: spotifyId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save track');
      }

      return response.json();
    },
  });
}
