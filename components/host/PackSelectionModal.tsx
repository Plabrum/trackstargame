/**
 * Pack Selection Modal Component
 *
 * Modal wrapper for pack selection used in the "Play Again" flow.
 * Displays the full pack gallery in a side sheet.
 */

"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PackGalleryContent } from "./PackGalleryContent";
import { useState } from "react";

interface PackSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPackSelected: (packId: string) => void;
  isResetting?: boolean;
}

export function PackSelectionModal({
  open,
  onOpenChange,
  onPackSelected,
  isResetting = false,
}: PackSelectionModalProps) {
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  const handlePackAction = (packId: string) => {
    setSelectedPackId(packId);
    onPackSelected(packId);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[90vw] overflow-y-auto"
      >
        <SheetHeader className="mb-6">
          <SheetTitle>Choose a New Pack</SheetTitle>
          <SheetDescription>
            Select a music pack to start a new game with the same players
          </SheetDescription>
        </SheetHeader>

        <PackGalleryContent
          onPackAction={handlePackAction}
          actionLabel="Select Pack"
          isProcessing={isResetting}
          processingPackId={selectedPackId}
        />
      </SheetContent>
    </Sheet>
  );
}
