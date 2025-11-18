"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Users, Gamepad2 } from "lucide-react";
import { useUpdateSettings } from "@/hooks/mutations/use-game-mutations";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/lib/types/database";

type GameSession = Tables<'game_sessions'>;

interface GameSettingsFormProps {
  session: GameSession;
}

export function GameSettingsForm({ session }: GameSettingsFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const updateSettings = useUpdateSettings();

  const [totalRounds, setTotalRounds] = useState(session.total_rounds.toString());
  const [allowHostToPlay, setAllowHostToPlay] = useState(session.allow_host_to_play);
  const [allowSingleUser, setAllowSingleUser] = useState(session.allow_single_user);

  const handleContinue = async () => {
    try {
      await updateSettings.mutateAsync({
        sessionId: session.id,
        allowHostToPlay,
        allowSingleUser,
        totalRounds: parseInt(totalRounds),
      });

      toast({
        title: "Settings saved!",
        description: "Redirecting to lobby...",
      });

      // Redirect to lobby
      router.push(`/host/${session.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Game Settings</h1>
        <p className="text-muted-foreground">Configure your game before entering the lobby</p>
      </div>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Game Configuration
          </CardTitle>
          <CardDescription>
            Customize how your game will be played
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Number of Rounds */}
          <div className="space-y-2">
            <Label htmlFor="rounds" className="text-base font-semibold">
              Number of Rounds
            </Label>
            <Select value={totalRounds} onValueChange={setTotalRounds}>
              <SelectTrigger id="rounds" className="w-full">
                <SelectValue placeholder="Select number of rounds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 Rounds</SelectItem>
                <SelectItem value="10">10 Rounds</SelectItem>
                <SelectItem value="15">15 Rounds</SelectItem>
                <SelectItem value="20">20 Rounds</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose how many rounds you want to play
            </p>
          </div>

          {/* Allow Host to Play */}
          <div className="flex items-start justify-between space-x-4 rounded-lg border p-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="host-play" className="text-base font-semibold flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                Allow Host to Play
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable this to participate as a player in your own game. You&apos;ll appear in the player list and can buzz in while still controlling the game.
              </p>
            </div>
            <Switch
              id="host-play"
              checked={allowHostToPlay}
              onCheckedChange={setAllowHostToPlay}
            />
          </div>

          {/* Allow Single User */}
          <div className="flex items-start justify-between space-x-4 rounded-lg border p-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="single-user" className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Allow Single User Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Practice solo! Play the game by yourself with full scoring and leaderboard. Perfect for learning new tracks or testing your knowledge.
              </p>
            </div>
            <Switch
              id="single-user"
              checked={allowSingleUser}
              onCheckedChange={setAllowSingleUser}
            />
          </div>

          {/* Info Alert */}
          {(allowHostToPlay || allowSingleUser) && (
            <Alert>
              <AlertDescription>
                {allowSingleUser && "You can start the game with 0 other players. "}
                {allowHostToPlay && !allowSingleUser && "You'll need at least 1 other player to join. "}
                {allowHostToPlay && "You will be automatically added as a player when you start the game."}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Continue Button */}
      <Card className="border-2 border-primary">
        <CardContent className="pt-6">
          <Button
            className="w-full"
            size="lg"
            onClick={handleContinue}
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending ? "Saving..." : "Continue to Lobby"}
          </Button>

          <p className="text-sm text-muted-foreground text-center mt-4">
            You can modify these settings later from the lobby
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
