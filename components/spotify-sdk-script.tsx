/**
 * Client component to load Spotify SDK with callback
 */

'use client';

import Script from 'next/script';
import { useEffect } from 'react';

export function SpotifySDKScript() {
  // Define the callback BEFORE the script loads
  useEffect(() => {
    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log('[Spotify] SDK Ready');
    };
  }, []);

  return (
    <Script
      src="https://sdk.scdn.co/spotify-player.js"
      strategy="afterInteractive"
    />
  );
}
