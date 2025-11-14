"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface HealthCheckResponse {
  status: string;
  message: string;
  packs_count?: number;
  timestamp?: string;
  error?: string;
}

export default function Home() {
  const [healthStatus, setHealthStatus] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkHealth() {
      try {
        const response = await fetch("/api/health");
        const data = await response.json();
        setHealthStatus(data);
      } catch (error) {
        setHealthStatus({
          status: "error",
          message: "Failed to fetch health status",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      } finally {
        setLoading(false);
      }
    }

    checkHealth();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-5xl font-bold mb-2">🎮 Trackstar</h1>
        <p className="text-xl text-muted-foreground">Music Guessing Game</p>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Phase 1: Setup Complete
              {!loading && healthStatus && (
                <Badge variant={healthStatus.status === "ok" ? "default" : "destructive"}>
                  {healthStatus.status === "ok" ? "✓ Connected" : "✗ Error"}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Infrastructure validation and database connection test
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : healthStatus ? (
              <div className="text-left space-y-2">
                <p className="text-sm">
                  <span className="font-semibold">Status:</span> {healthStatus.message}
                </p>
                {healthStatus.packs_count !== undefined && (
                  <p className="text-sm">
                    <span className="font-semibold">Packs in database:</span> {healthStatus.packs_count}
                  </p>
                )}
                {healthStatus.timestamp && (
                  <p className="text-sm text-muted-foreground">
                    {new Date(healthStatus.timestamp).toLocaleString()}
                  </p>
                )}
                {healthStatus.error && (
                  <p className="text-sm text-destructive">
                    <span className="font-semibold">Error:</span> {healthStatus.error}
                  </p>
                )}
              </div>
            ) : null}

            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2">Phase 1 Checklist:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>✓ Next.js 15 with TypeScript</li>
                <li>✓ Tailwind CSS + Shadcn UI</li>
                <li>✓ Supabase database schema (5 tables)</li>
                <li>✓ TypeScript types generated</li>
                <li>✓ Supabase client utilities</li>
                <li>✓ Health check API route</li>
                <li className="text-primary font-semibold">→ Ready for Phase 2 implementation</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground mt-8">
          Phase 2+ will include game creation, player lobbies, and real-time gameplay
        </p>
      </div>
    </main>
  );
}
