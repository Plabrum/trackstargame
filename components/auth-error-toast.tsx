"use client";

import { useUrlToast } from "@/hooks/use-url-toast";

export function AuthErrorToast() {
  useUrlToast({
    paramName: "error",
    messages: {
      token_expired: {
        title: "Authentication Error",
        description: "Your session expired. Please sign in again.",
        variant: "destructive",
      },
      refresh_failed: {
        title: "Authentication Error",
        description: "Failed to refresh your session. Please sign in again.",
        variant: "destructive",
      },
      api_error: {
        title: "Authentication Error",
        description: "An error occurred with Spotify. Please try again.",
        variant: "destructive",
      },
      network_error: {
        title: "Authentication Error",
        description: "Network error. Please check your connection and try again.",
        variant: "destructive",
      },
      spotify_auth_failed: {
        title: "Authentication Error",
        description: "Spotify authentication failed. Please try again.",
        variant: "destructive",
      },
      no_code: {
        title: "Authentication Error",
        description: "Authentication failed - no code received from Spotify.",
        variant: "destructive",
      },
      token_exchange_failed: {
        title: "Authentication Error",
        description: "Failed to exchange authentication code. Please try again.",
        variant: "destructive",
      },
    },
    defaultMessage: {
      title: "Authentication Error",
      description: "An error occurred. Please try again.",
      variant: "destructive",
    },
  });

  return null;
}
