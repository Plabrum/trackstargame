/**
 * Session Resource API
 *
 * GET   /api/sessions/[id] - Get session details
 * PATCH /api/sessions/[id] - Update session state
 * DELETE /api/sessions/[id] - Delete session
 *
 * Query params for GET:
 * ?include=players,rounds,pack - Include related resources
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNextGameState, enforceGameStartRules, StateTransitionError, GameRuleError } from '@/lib/api/state-machine-middleware';
import { broadcastGameEvent, broadcastStateChange } from '@/lib/game/realtime';
import { validateGameState } from '@/lib/game/state-machine';

/**
 * GET /api/sessions/[id]
 * Fetch session with optional includes
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const include = searchParams.get('include')?.split(',') || [];

    const supabase = await createClient();

    // Fetch base session
    const { data: session, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const result: any = { ...session };

    // Conditionally include related resources
    if (include.includes('players')) {
      const { data: players } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', sessionId)
        .order('score', { ascending: false });

      result.players = players || [];
    }

    if (include.includes('rounds')) {
      const { data: rounds } = await supabase
        .from('game_rounds')
        .select('*')
        .eq('session_id', sessionId)
        .order('round_number', { ascending: true });

      result.rounds = rounds || [];
    }

    if (include.includes('pack') && session.pack_id) {
      const { data: pack } = await supabase
        .from('packs')
        .select('*')
        .eq('id', session.pack_id)
        .single();

      result.pack = pack;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/sessions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sessions/[id]
 * Update session state
 *
 * Request: { action: "start" | "end" }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const { action } = body;

    console.log('[PATCH /api/sessions/[id]] Action:', action, 'Body:', body);

    const supabase = await createClient();

    switch (action) {
      case 'start': {
        console.log('[Start Game] Starting game for session:', sessionId);
        // Get session and validate
        const { data: session, error: sessionError } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError || !session) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Apply settings if provided
        if (body.settings) {
          const { totalRounds, allowHostToPlay, allowSingleUser, enableTextInputMode } = body.settings;

          const settingsUpdate: any = {};
          if (totalRounds !== undefined) settingsUpdate.total_rounds = totalRounds;
          if (allowHostToPlay !== undefined) settingsUpdate.allow_host_to_play = allowHostToPlay;
          if (allowSingleUser !== undefined) settingsUpdate.allow_single_user = allowSingleUser;
          if (enableTextInputMode !== undefined) settingsUpdate.enable_text_input_mode = enableTextInputMode;

          const { error: updateError } = await supabase
            .from('game_sessions')
            .update(settingsUpdate)
            .eq('id', sessionId);

          if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
          }

          // Refresh session data with updated settings
          const { data: updatedSessionData } = await supabase
            .from('game_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

          if (updatedSessionData) {
            Object.assign(session, updatedSessionData);
          }

          // Handle host player creation/removal based on allowHostToPlay
          console.log('[Start Game] allowHostToPlay:', allowHostToPlay);
          if (allowHostToPlay) {
            console.log('[Start Game] Creating/checking host player for:', session.host_name);
            const { data: existingHostPlayer } = await supabase
              .from('players')
              .select('id')
              .eq('session_id', sessionId)
              .eq('name', session.host_name)
              .single();

            console.log('[Start Game] Existing host player:', existingHostPlayer);

            if (!existingHostPlayer) {
              console.log('[Start Game] Creating new host player');
              const { data: newPlayer, error: playerError } = await supabase
                .from('players')
                .insert({
                  session_id: sessionId,
                  name: session.host_name,
                  score: 0,
                  is_host: true,
                })
                .select()
                .single();

              console.log('[Start Game] Created host player:', newPlayer, 'Error:', playerError);

              if (newPlayer) {
                await broadcastGameEvent(sessionId, {
                  type: 'player_joined',
                  playerId: newPlayer.id,
                  playerName: session.host_name,
                });
              }
            }
          } else {
            const { data: hostPlayer } = await supabase
              .from('players')
              .select('id')
              .eq('session_id', sessionId)
              .eq('name', session.host_name)
              .single();

            if (hostPlayer) {
              await supabase
                .from('players')
                .delete()
                .eq('id', hostPlayer.id);

              await broadcastGameEvent(sessionId, {
                type: 'player_left',
                playerId: hostPlayer.id,
                playerName: session.host_name,
              });
            }
          }
        }

        // Get player count (after settings have potentially added/removed host)
        const { count: playerCount } = await supabase
          .from('players')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', sessionId);

        const currentState = validateGameState(session.state);

        try {
          // Enforce game rules
          enforceGameStartRules(session, playerCount ?? 0);

          // Get next state through state machine
          const nextState = getNextGameState(currentState, 'start');

          // Get random track from pack for first round
          if (!session.pack_id) {
            return NextResponse.json(
              { error: 'Session has no pack assigned' },
              { status: 400 }
            );
          }

          const { data: tracks, error: tracksError } = await supabase
            .from('tracks')
            .select('id')
            .eq('pack_id', session.pack_id);

          if (tracksError || !tracks || tracks.length === 0) {
            return NextResponse.json(
              { error: 'No tracks found in pack' },
              { status: 500 }
            );
          }

          // Pick random track for first round
          const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];

          // Create first round with track
          const { data: firstRound, error: roundError } = await supabase
            .from('game_rounds')
            .insert({
              session_id: sessionId,
              round_number: 1,
              track_id: randomTrack.id,
            })
            .select()
            .single();

          if (roundError || !firstRound) {
            return NextResponse.json({ error: 'Failed to create first round' }, { status: 500 });
          }

          // Update session state to 'playing' with current_round = 1 and start time
          const { data: updatedSession, error: updateError } = await supabase
            .from('game_sessions')
            .update({
              state: nextState,
              current_round: 1,
              round_start_time: new Date().toISOString(),
            })
            .eq('id', sessionId)
            .select()
            .single();

          if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
          }

          // Broadcast game started event
          await broadcastGameEvent(sessionId, {
            type: 'game_started',
            roundNumber: 1,
          });

          // Broadcast round start event
          await broadcastGameEvent(sessionId, {
            type: 'round_start',
            roundNumber: 1,
            trackId: randomTrack.id,
          });

          await broadcastStateChange(sessionId, nextState);

          return NextResponse.json(updatedSession);
        } catch (error) {
          if (error instanceof StateTransitionError || error instanceof GameRuleError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
          }
          throw error;
        }
      }

      case 'end': {
        // Get session and validate
        const { data: session, error: sessionError } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError || !session) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        const currentState = validateGameState(session.state);

        try {
          // Get next state through state machine
          const nextState = getNextGameState(currentState, 'finish');

          // Get final leaderboard
          const { data: players } = await supabase
            .from('players')
            .select('id, name, score')
            .eq('session_id', sessionId)
            .order('score', { ascending: false });

          const leaderboard = (players || []).map(p => ({
            playerId: p.id,
            playerName: p.name,
            score: p.score ?? 0,
          }));

          const winner = leaderboard[0] || {
            playerId: '',
            playerName: 'No winner',
            score: 0,
          };

          // Update session state to finished
          const { data: updatedSession, error: updateError } = await supabase
            .from('game_sessions')
            .update({ state: nextState })
            .eq('id', sessionId)
            .select()
            .single();

          if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
          }

          // Broadcast game end event
          await broadcastGameEvent(sessionId, {
            type: 'game_end',
            leaderboard,
            winner,
          });

          await broadcastStateChange(sessionId, nextState);

          return NextResponse.json(updatedSession);
        } catch (error) {
          if (error instanceof StateTransitionError || error instanceof GameRuleError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
          }
          throw error;
        }
      }

      case 'settings': {
        // Get session and validate
        const { data: session, error: sessionError } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError || !session) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Only allow settings update in lobby state
        if (session.state !== 'lobby') {
          return NextResponse.json(
            { error: 'Settings can only be updated in lobby state' },
            { status: 400 }
          );
        }

        const { allowHostToPlay, allowSingleUser, enableTextInputMode, totalRounds } = body;

        // Validate settings
        if (typeof totalRounds !== 'number' || totalRounds < 1 || totalRounds > 50) {
          return NextResponse.json(
            { error: 'Total rounds must be between 1 and 50' },
            { status: 400 }
          );
        }

        // Update session settings
        const { data: updatedSession, error: updateError } = await supabase
          .from('game_sessions')
          .update({
            allow_host_to_play: allowHostToPlay,
            allow_single_user: allowSingleUser,
            enable_text_input_mode: enableTextInputMode,
            total_rounds: totalRounds,
          })
          .eq('id', sessionId)
          .select()
          .single();

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // If allow_host_to_play is enabled, create/ensure host player exists
        if (allowHostToPlay) {
          // Check if host player already exists
          const { data: existingHostPlayer } = await supabase
            .from('players')
            .select('id')
            .eq('session_id', sessionId)
            .eq('name', session.host_name)
            .single();

          // Create host player if doesn't exist
          if (!existingHostPlayer) {
            const { data: newPlayer, error: playerError } = await supabase
              .from('players')
              .insert({
                session_id: sessionId,
                name: session.host_name,
                score: 0,
                is_host: true,
              })
              .select()
              .single();

            if (playerError || !newPlayer) {
              console.error('Failed to create host player:', playerError);
              return NextResponse.json(
                { error: 'Failed to create host player' },
                { status: 500 }
              );
            }

            // Broadcast player joined event
            await broadcastGameEvent(sessionId, {
              type: 'player_joined',
              playerId: newPlayer.id,
              playerName: session.host_name,
            });
          }
        } else {
          // If allow_host_to_play is disabled, remove host player if exists
          const { data: hostPlayer } = await supabase
            .from('players')
            .select('id')
            .eq('session_id', sessionId)
            .eq('name', session.host_name)
            .single();

          if (hostPlayer) {
            await supabase
              .from('players')
              .delete()
              .eq('id', hostPlayer.id);

            // Broadcast player left event
            await broadcastGameEvent(sessionId, {
              type: 'player_left',
              playerId: hostPlayer.id,
              playerName: session.host_name,
            });
          }
        }

        return NextResponse.json(updatedSession);
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "start", "end", or "settings"' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in PATCH /api/sessions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions/[id]
 * Delete a session (cleanup)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from('game_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/sessions/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
