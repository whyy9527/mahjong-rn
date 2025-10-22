/**
 * Replay and Verification Service
 * Handles event replay and conflict detection
 * Terminal snapshot consistency verification
 */

import {
  GameState,
  VoiceEvent,
  GameAction,
  ScoreSheet,
  ReplayConflict,
  PlayerPosition,
} from '../types';

/**
 * Replay voice events in order
 * 
 * @param voiceEvents Array of voice events to replay
 * @returns Replayed events with metadata
 */
export function replayVoiceEvents(
  voiceEvents: VoiceEvent[]
): Array<{event: VoiceEvent; replayTime: number}> {
  const sortedEvents = [...voiceEvents].sort((a, b) => a.timestamp - b.timestamp);
  
  return sortedEvents.map(event => ({
    event,
    replayTime: Date.now(),
  }));
}

/**
 * Verify game action sequence consistency
 * Checks for logical errors in action order
 * 
 * @param actions Array of game actions
 * @returns Array of detected conflicts
 */
export function verifyActionSequence(actions: GameAction[]): ReplayConflict[] {
  const conflicts: ReplayConflict[] = [];
  const sortedActions = [...actions].sort((a, b) => a.timestamp - b.timestamp);

  // Check for duplicate actions at same timestamp
  const timestampMap = new Map<number, GameAction[]>();
  sortedActions.forEach(action => {
    const existing = timestampMap.get(action.timestamp) || [];
    existing.push(action);
    timestampMap.set(action.timestamp, existing);
  });

  timestampMap.forEach((actionsAtTime, timestamp) => {
    if (actionsAtTime.length > 1) {
      conflicts.push({
        id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp,
        type: 'duplicate_action',
        description: `Multiple actions at timestamp ${timestamp}`,
        severity: 'medium',
        affectedEvents: actionsAtTime.map(a => a.id),
        suggestedResolution: 'Review action timestamps and order',
      });
    }
  });

  // Check for missing required actions
  let lastDiscard: GameAction | null = null;
  sortedActions.forEach((action, idx) => {
    if (action.actionType === 'pong' || action.actionType === 'kong') {
      // Pong/Kong should follow a discard
      if (!lastDiscard || idx === 0) {
        conflicts.push({
          id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: action.timestamp,
          type: 'action_order',
          description: `${action.actionType} without preceding discard`,
          severity: 'high',
          affectedEvents: [action.id, lastDiscard?.id || 'none'],
          suggestedResolution: 'Verify action sequence',
        });
      }
    }
    if (action.actionType === 'discard') {
      lastDiscard = action;
    }
  });

  return conflicts;
}

/**
 * Verify score sheet consistency
 * Checks that scores add up correctly (zero-sum)
 * 
 * @param scoreSheet Score sheet to verify
 * @returns Array of detected conflicts
 */
export function verifyScoreSheetConsistency(scoreSheet: ScoreSheet): ReplayConflict[] {
  const conflicts: ReplayConflict[] = [];
  const positions: PlayerPosition[] = ['东', '南', '西', '北'];

  // Check zero-sum
  const total = positions.reduce((sum, pos) => sum + scoreSheet.totalScores[pos], 0);
  
  if (Math.abs(total) > 0.01) {
    conflicts.push({
      id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: scoreSheet.timestamp,
      type: 'score_mismatch',
      description: `Scores don't sum to zero: ${total}`,
      severity: 'high',
      affectedEvents: [scoreSheet.id],
      suggestedResolution: 'Recalculate scores or add adjustment',
    });
  }

  // Check that all score details are valid
  scoreSheet.details.forEach((detail, idx) => {
    if (detail.fan > 5) {
      conflicts.push({
        id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: scoreSheet.timestamp,
        type: 'score_mismatch',
        description: `Win ${idx + 1} exceeds fan limit: ${detail.fan}`,
        severity: 'high',
        affectedEvents: [scoreSheet.id],
        suggestedResolution: 'Cap fan at 5',
      });
    }
  });

  return conflicts;
}

/**
 * Verify terminal snapshot consistency
 * Compares final state with expected state
 * 
 * @param gameState Current game state
 * @param expectedScores Expected final scores
 * @returns Array of detected conflicts
 */
export function verifyTerminalSnapshot(
  gameState: GameState,
  expectedScores?: Record<PlayerPosition, number>
): ReplayConflict[] {
  const conflicts: ReplayConflict[] = [];

  // If expected scores provided, compare
  if (expectedScores) {
    const positions: PlayerPosition[] = ['东', '南', '西', '北'];
    let hasScoreMismatch = false;

    positions.forEach(pos => {
      const actual = gameState.players[pos].score;
      const expected = expectedScores[pos];
      
      if (Math.abs(actual - expected) > 0.01) {
        hasScoreMismatch = true;
      }
    });

    if (hasScoreMismatch) {
      conflicts.push({
        id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: 'score_mismatch',
        description: 'Final scores do not match expected values',
        severity: 'high',
        affectedEvents: gameState.scoreSheets.map(s => s.id),
        suggestedResolution: 'Review all score sheets and adjustments',
      });
    }
  }

  // Check for orphaned voice events (events not associated with actions)
  const actionVoiceEventIds = new Set(
    gameState.actions
      .filter(a => a.voiceEventId)
      .map(a => a.voiceEventId!)
  );

  const orphanedEvents = gameState.voiceEvents.filter(
    e => !actionVoiceEventIds.has(e.id)
  );

  if (orphanedEvents.length > 0) {
    conflicts.push({
      id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'missing_event',
      description: `${orphanedEvents.length} voice events not associated with actions`,
      severity: 'low',
      affectedEvents: orphanedEvents.map(e => e.id),
      suggestedResolution: 'Review voice events and ensure all are processed',
    });
  }

  return conflicts;
}

/**
 * Generate comprehensive conflict report
 * 
 * @param gameState Game state to analyze
 * @param expectedScores Optional expected final scores
 * @returns Complete list of all detected conflicts
 */
export function generateConflictReport(
  gameState: GameState,
  expectedScores?: Record<PlayerPosition, number>
): {
  conflicts: ReplayConflict[];
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
} {
  const conflicts: ReplayConflict[] = [];

  // Verify action sequence
  conflicts.push(...verifyActionSequence(gameState.actions));

  // Verify each score sheet
  gameState.scoreSheets.forEach(sheet => {
    conflicts.push(...verifyScoreSheetConsistency(sheet));
  });

  // Verify terminal snapshot
  conflicts.push(...verifyTerminalSnapshot(gameState, expectedScores));

  // Generate summary
  const summary = {
    total: conflicts.length,
    high: conflicts.filter(c => c.severity === 'high').length,
    medium: conflicts.filter(c => c.severity === 'medium').length,
    low: conflicts.filter(c => c.severity === 'low').length,
  };

  return {conflicts, summary};
}

/**
 * Replay entire game from event stream
 * Reconstructs game state from voice events and actions
 * 
 * @param voiceEvents Voice events to replay
 * @param initialState Initial game state
 * @returns Reconstructed final state and conflicts
 */
export function replayGameFromEvents(
  voiceEvents: VoiceEvent[],
  initialState: GameState
): {
  finalState: GameState;
  conflicts: ReplayConflict[];
} {
  // Sort events by timestamp
  const sortedEvents = [...voiceEvents].sort((a, b) => a.timestamp - b.timestamp);
  
  // Start with initial state
  let currentState = {...initialState};

  // Replay each event
  // In production, this would reconstruct the full game state
  // For now, we just validate the sequence
  
  const conflicts = verifyActionSequence(currentState.actions);

  return {
    finalState: currentState,
    conflicts,
  };
}
