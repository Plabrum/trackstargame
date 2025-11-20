"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Settings, User, Users, KeyboardIcon } from "lucide-react";
import { useUpdateSettings } from "@/hooks/mutations/use-game-mutations";
import { toast } from "sonner";
import type { Tables } from "@/lib/types/database";

type GameSession = Tables<'game_sessions'>;

interface GameSettingsFormProps {
  session: GameSession;
  onSuccess?: () => void;
  embedded?: boolean;
  // Controlled mode (for embedded forms that don't save immediately)
  totalRounds?: number;
  onTotalRoundsChange?: (value: number) => void;
  gameMode?: 'solo' | 'party';
  onGameModeChange?: (value: 'solo' | 'party') => void;
  partyTextInput?: boolean;
  onPartyTextInputChange?: (value: boolean) => void;
  partyHostPlays?: boolean;
  onPartyHostPlaysChange?: (value: boolean) => void;
}

export function GameSettingsForm({
  session,
  onSuccess,
  embedded = false,
  // Controlled props
  totalRounds: controlledTotalRounds,
  onTotalRoundsChange,
  gameMode: controlledGameMode,
  onGameModeChange,
  partyTextInput: controlledPartyTextInput,
  onPartyTextInputChange,
  partyHostPlays: controlledPartyHostPlays,
  onPartyHostPlaysChange,
}: GameSettingsFormProps) {
  const router = useRouter();
  const updateSettings = useUpdateSettings();

  // Settings panel state
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Use controlled values if provided, otherwise use local state
  const [localTotalRounds, setLocalTotalRounds] = useState(session.total_rounds.toString());
  const totalRoundsStr = controlledTotalRounds !== undefined ? controlledTotalRounds.toString() : localTotalRounds;
  const handleTotalRoundsChange = (value: string) => {
    if (onTotalRoundsChange) {
      onTotalRoundsChange(parseInt(value));
    } else {
      setLocalTotalRounds(value);
    }
  };

  // Determine initial game mode from session settings
  // Solo mode = host plays + text input enabled
  const initialGameMode = session.allow_host_to_play && session.enable_text_input_mode ? 'solo' : 'party';
  const [localGameMode, setLocalGameMode] = useState<'solo' | 'party'>(initialGameMode);
  const gameMode = controlledGameMode !== undefined ? controlledGameMode : localGameMode;
  const handleGameModeChange = (value: 'solo' | 'party') => {
    if (onGameModeChange) {
      onGameModeChange(value);
    } else {
      setLocalGameMode(value);
    }
  };

  // Party mode specific settings
  const [localPartyTextInput, setLocalPartyTextInput] = useState(session.enable_text_input_mode ?? false);
  const partyTextInput = controlledPartyTextInput !== undefined ? controlledPartyTextInput : localPartyTextInput;
  const handlePartyTextInputChange = (value: boolean) => {
    if (onPartyTextInputChange) {
      onPartyTextInputChange(value);
    } else {
      setLocalPartyTextInput(value);
    }
  };

  const [localPartyHostPlays, setLocalPartyHostPlays] = useState(session.allow_host_to_play);
  const partyHostPlays = controlledPartyHostPlays !== undefined ? controlledPartyHostPlays : localPartyHostPlays;
  const handlePartyHostPlaysChange = (value: boolean) => {
    if (onPartyHostPlaysChange) {
      onPartyHostPlaysChange(value);
    } else {
      setLocalPartyHostPlays(value);
    }
  };

  const handleContinue = async () => {
    try {
      // Derive backend settings from game mode
      let allowHostToPlay: boolean;
      let enableTextInputMode: boolean;

      if (gameMode === 'solo') {
        // Solo mode: all preset
        enableTextInputMode = true;
        allowHostToPlay = true;
      } else {
        // Party mode: use toggles
        enableTextInputMode = partyTextInput;
        // Host can only play if text input is enabled
        allowHostToPlay = partyTextInput && partyHostPlays;
      }

      await updateSettings.mutateAsync({
        sessionId: session.id,
        allowHostToPlay,
        enableTextInputMode,
        totalRounds: parseInt(totalRoundsStr),
      });

      toast.success("Settings saved!", {
        description: embedded ? "Settings updated successfully" : "Redirecting to lobby...",
      });

      // Call onSuccess callback if embedded, otherwise redirect
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/host/${session.id}`);
      }
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to save settings",
      });
    }
  };

  const formContent = (
    <div className="space-y-6">
      {/* Game Mode Tabs with Settings Cog */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Game Mode</Label>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="h-8 w-8"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <Tabs value={gameMode} onValueChange={(value: string) => handleGameModeChange(value as 'solo' | 'party')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="solo" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Solo Mode
            </TabsTrigger>
            <TabsTrigger value="party" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Party Mode
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Collapsible Settings */}
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Number of Rounds */}
            <div className="space-y-2">
              <Label htmlFor="rounds" className="text-base font-semibold">
                Number of Rounds
              </Label>
              <Select value={totalRoundsStr} onValueChange={handleTotalRoundsChange}>
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
            </div>

            {/* Party Mode Settings */}
            {gameMode === 'party' && (
              <>
                {/* Enable Text Input Mode */}
                <div className="flex items-start justify-between space-x-4 rounded-lg border p-4">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="party-text-input" className="text-base font-semibold flex items-center gap-2">
                      <KeyboardIcon className="h-4 w-4" />
                      Enable Text Input
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Players type answers instead of buzzing. Answers are auto-validated with host override.
                    </p>
                  </div>
                  <Switch
                    id="party-text-input"
                    checked={partyTextInput}
                    onCheckedChange={(checked) => {
                      handlePartyTextInputChange(checked);
                      // If disabling text input, also disable host play
                      if (!checked) {
                        handlePartyHostPlaysChange(false);
                      }
                    }}
                  />
                </div>

                {/* Allow Host to Play (only when text input is enabled) */}
                <div className={`flex items-start justify-between space-x-4 rounded-lg border p-4 ${!partyTextInput ? 'opacity-50' : ''
                  }`}>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="party-host-play" className="text-base font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Allow Host to Play
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {partyTextInput
                        ? "Join as a player while hosting. You'll submit answers like everyone else."
                        : "Only available in text input mode (prevents seeing player buzzes)"
                      }
                    </p>
                  </div>
                  <Switch
                    id="party-host-play"
                    checked={partyHostPlays}
                    onCheckedChange={handlePartyHostPlaysChange}
                    disabled={!partyTextInput}
                  />
                </div>
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );

  // If embedded, return just the form content without Card wrapper (no submit button)
  if (embedded) {
    return formContent;
  }

  // For standalone page, wrap in Card
  const content = (
    <>
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
        <CardContent>
          {formContent}
        </CardContent>
      </Card>
    </>
  );

  // Otherwise, wrap in full page layout
  return (
    <div className="container mx-auto p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Game Settings</h1>
        <p className="text-muted-foreground">Configure your game before entering the lobby</p>
      </div>

      {content}

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
