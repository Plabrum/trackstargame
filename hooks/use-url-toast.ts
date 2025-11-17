"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export interface UrlToastConfig {
  /**
   * The URL parameter name to watch for (default: "error")
   */
  paramName?: string;

  /**
   * Map of param values to toast messages
   */
  messages: Record<string, {
    title?: string;
    description: string;
    variant?: "default" | "destructive";
  }>;

  /**
   * Default message if param value not found in messages map
   */
  defaultMessage?: {
    title?: string;
    description: string;
    variant?: "default" | "destructive";
  };
}

/**
 * Hook that watches for a URL parameter, shows a toast, and clears the param
 *
 * @example
 * ```tsx
 * useUrlToast({
 *   paramName: "error",
 *   messages: {
 *     not_found: { description: "Item not found" },
 *     unauthorized: { description: "You don't have permission", variant: "destructive" }
 *   }
 * });
 * ```
 */
export function useUrlToast(config: UrlToastConfig) {
  const { paramName = "error", messages, defaultMessage } = config;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const paramValue = searchParams.get(paramName);
    if (paramValue) {
      // Get message config or use default
      const messageConfig = messages[paramValue] || defaultMessage;

      if (messageConfig) {
        // Show toast
        toast({
          title: messageConfig.title,
          description: messageConfig.description,
          variant: messageConfig.variant || "default",
        });
      }

      // Clean up URL by removing the param
      // Use replace to avoid adding to browser history
      const url = new URL(window.location.href);
      url.searchParams.delete(paramName);
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, paramName, messages, defaultMessage, toast, router]);
}
