/**
 * LoadingWrapper
 *
 * Shows a skeleton loading state while content is loading.
 * Displays children once loading is complete.
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface LoadingWrapperProps {
  isLoading: boolean;
  children: React.ReactNode;
}

export function LoadingWrapper({ isLoading, children }: LoadingWrapperProps) {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header Skeleton */}
      <Skeleton className="h-12 w-64 mx-auto" />

      {/* Main Content Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>

      {/* Secondary Content Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
