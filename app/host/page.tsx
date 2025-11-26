/**
 * Pack Selection Page (/host)
 *
 * Displayed after Spotify OAuth. Shows a gallery of available music packs.
 * User can view songs in each pack or start a game immediately.
 */

'use client';

import { PackGallery } from "@/components/host/PackGallery";
import { Header } from "@/components/shared/Header";
import { UserDisplay, LogoutButton } from "@/components/shared/UserInfo";

export default function SelectPackPage() {
  return (
    <main className="min-h-screen p-6 bg-black">
      <div className="container mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <Header
          title="Select a Music Pack"
          rightContent={
            <>
              <UserDisplay />
              <LogoutButton />
            </>
          }
        />

        {/* Pack Gallery */}
        <PackGallery />
      </div>
    </main>
  );
}
