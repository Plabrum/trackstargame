/**
 * Header Component
 *
 * Reusable header with logo and optional right-side content
 * Automatically handles mobile responsiveness with a popover menu
 */

'use client';

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Children } from "react";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface HeaderProps {
  title: string;
  rightContent?: ReactNode;
}

export function Header({ title, rightContent }: HeaderProps) {
  const childrenArray = rightContent ? Children.toArray(rightContent) : [];
  const hasContent = childrenArray.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/host" className="flex-shrink-0 hover:opacity-80 transition-opacity">
          <Image
            src="/small_logo.svg"
            alt="Trackstar"
            width={48}
            height={48}
            className="w-12 h-12"
          />
        </Link>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
          {title}
        </h1>
      </div>

      {hasContent && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="p-2">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="end">
            <div className="flex flex-col gap-3">
              {rightContent}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
