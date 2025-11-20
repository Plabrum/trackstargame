"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Eye, X } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface ShareButtonProps {
  /** The element to capture and share */
  targetRef: React.RefObject<HTMLElement | null>;
  /** Title for the shared content */
  title?: string;
  /** Text to accompany the shared content */
  text?: string;
}

export function ShareButton({ targetRef, title = "My Trackstar Game Score", text }: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const captureAndShare = async () => {
    if (!targetRef.current) {
      toast.error("Error", {
        description: "Content not ready to share",
      });
      return;
    }

    setIsSharing(true);

    try {
      // Capture the element as canvas
      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        logging: false,
        useCORS: true, // Allow cross-origin images (album art)
      });

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/png');
      });

      // Create file from blob
      const file = new File([blob], 'trackstar-score.png', { type: 'image/png' });

      // Check if Web Share API is available and supports files
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          text,
          files: [file],
        });

        toast.success("Shared!", {
          description: "Your score has been shared successfully",
        });
      } else {
        // Fallback: Download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'trackstar-score.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success("Downloaded!", {
          description: "Your score card has been downloaded",
        });
      }
    } catch (error) {
      console.error('Share error:', error);

      // Only show error if it's not user cancellation
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error("Share failed", {
          description: "Could not share your score. Try downloading instead.",
        });
      }
    } finally {
      setIsSharing(false);
    }
  };

  // Handle escape key to close preview
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showPreview) {
        setShowPreview(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showPreview]);

  return (
    <>
      <div className="flex gap-2">
        {/* Preview Button */}
        <Button
          onClick={() => setShowPreview(true)}
          variant="outline"
          size="lg"
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>

        {/* Share Button */}
        <Button
          onClick={captureAndShare}
          disabled={isSharing}
          className="flex-1"
          size="lg"
        >
          {isSharing ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Generating...
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4 mr-2" />
              Share Score
            </>
          )}
        </Button>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowPreview(false)}
        >
          {/* Close Button */}
          <button
            onClick={() => setShowPreview(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close preview"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Preview Content */}
          <div onClick={(e) => e.stopPropagation()}>
            {targetRef.current && (
              <div
                dangerouslySetInnerHTML={{ __html: targetRef.current.outerHTML }}
                className="shadow-2xl rounded-lg overflow-hidden"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
