/**
 * Header Component
 *
 * Reusable header with logo and optional right-side content
 */

'use client';

import Image from "next/image";
import type { ReactNode } from "react";

interface HeaderProps {
  title: string;
  rightContent?: ReactNode;
}

export function Header({ title, rightContent }: HeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Image
          src="/small_logo.svg"
          alt="Trackstar"
          width={48}
          height={48}
          className="w-12 h-12"
        />
        <h1 className="text-4xl font-bold text-white">
          {title}
        </h1>
      </div>

      {rightContent && (
        <div className="flex items-center gap-3">
          {rightContent}
        </div>
      )}
    </div>
  );
}
