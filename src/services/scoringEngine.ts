/**
 * E5: Scoring Settlement Engine
 * Sichuan Bloody Battle (四川血战到底) Rules
 * KPI: Scoring accuracy ≥ 99.5%
 * 
 * Rules:
 * - Fan (番) limit: ≤ 5
 * - Kong types: 暗杠 (concealed), 明杠 (exposed), 加杠 (add)
 * - Kong scores are independent
 * - Multiple wins (多胡) supported
 */

import {
  PlayerPosition,
  ScoreDetail,
  ScoreSheet,
  KongType,
  ScoreAdjustment,
} from '../types';

/**
 * Base score calculation based on fan
 * Fan is capped at 5
 */
function calculateBaseScore(fan: number): number {
  const cappedFan = Math.min(fan, 5);
  return Math.pow(2, cappedFan); // 2^fan
}

/**
 * Kong score calculation
 * 暗杠 (concealed) = 4 points
 * 明杠 (exposed) = 2 points
 * 加杠 (add) = 2 points
 */
export function calculateKongScore(kongType: KongType): number {
  switch (kongType) {
    case 'concealed':
      return 4;
    case 'exposed':
      return 2;
    case 'add':
      return 2;
    default:
      return 0;
  }
}

/**
 * Calculate score for a single win
 * 
 * @param fan Number of fan (番)
 * @param isSelfDraw Whether it's a self-draw win
 * @param kongScore Independent kong score
 * @returns Score detail
 */
export function calculateWinScore(
  winner: PlayerPosition,
  loser: PlayerPosition | undefined,
  fan: number,
  isSelfDraw: boolean,
  kongScore: number = 0
): ScoreDetail {
  const baseScore = calculateBaseScore(fan);
  
  // Self-draw multiplier (each player pays)
  const multiplier = isSelfDraw ? 3 : 1;
  
  const totalScore = baseScore * multiplier + kongScore;

  return {
    winner,
    loser,
    fan: Math.min(fan, 5), // Cap at 5
    isSelfDraw,
    kongScore,
    baseScore,
    totalScore,
    multiplier,
  };
}

/**
 * Calculate scores for all players after a win
 * 
 * @param scoreDetail Score detail for the win
 * @param currentScores Current scores for all players
 * @returns Updated scores
 */
export function applyWinToScores(
  scoreDetail: ScoreDetail,
  currentScores: Record<PlayerPosition, number>
): Record<PlayerPosition, number> {
  const newScores = {...currentScores};

  if (scoreDetail.isSelfDraw) {
    // Self-draw: all other players pay
    const paymentPerPlayer = scoreDetail.baseScore + (scoreDetail.kongScore / 3);
    const positions: PlayerPosition[] = ['东', '南', '西', '北'];
    
    positions.forEach(pos => {
      if (pos === scoreDetail.winner) {
        newScores[pos] += scoreDetail.totalScore;
      } else {
        newScores[pos] -= paymentPerPlayer;
      }
    });
  } else {
    // Win on discard: only loser pays
    if (scoreDetail.loser) {
      newScores[scoreDetail.winner] += scoreDetail.totalScore;
      newScores[scoreDetail.loser] -= scoreDetail.totalScore;
    }
  }

  return newScores;
}

/**
 * Apply kong score (independent of win)
 * 
 * @param player Player who made the kong
 * @param kongType Type of kong
 * @param currentScores Current scores
 * @returns Updated scores
 */
export function applyKongScore(
  player: PlayerPosition,
  kongType: KongType,
  currentScores: Record<PlayerPosition, number>
): Record<PlayerPosition, number> {
  const kongScore = calculateKongScore(kongType);
  const newScores = {...currentScores};
  
  const positions: PlayerPosition[] = ['东', '南', '西', '北'];
  
  if (kongType === 'concealed') {
    // Concealed kong: all other players pay
    positions.forEach(pos => {
      if (pos === player) {
        newScores[pos] += kongScore * 3;
      } else {
        newScores[pos] -= kongScore;
      }
    });
  } else {
    // Exposed or add kong: paid by all others
    positions.forEach(pos => {
      if (pos === player) {
        newScores[pos] += kongScore * 3;
      } else {
        newScores[pos] -= kongScore;
      }
    });
  }

  return newScores;
}

/**
 * Create a score sheet for a round
 * Supports multiple wins (多胡)
 * 
 * @param gameId Game identifier
 * @param roundNumber Round number
 * @param scoreDetails Array of score details (for multiple wins)
 * @param kongDetails Kong details for the round
 * @param previousScores Previous round scores
 * @param adjustments Any score adjustments
 * @returns Complete score sheet
 */
export function createScoreSheet(
  gameId: string,
  roundNumber: number,
  scoreDetails: ScoreDetail[],
  kongDetails: Array<{player: PlayerPosition; type: KongType; score: number}>,
  previousScores: Record<PlayerPosition, number>,
  adjustments: ScoreAdjustment[] = []
): ScoreSheet {
  // Start with previous scores
  let currentScores = {...previousScores};

  // Apply all wins
  scoreDetails.forEach(detail => {
    currentScores = applyWinToScores(detail, currentScores);
  });

  // Apply kong scores
  kongDetails.forEach(kong => {
    currentScores = applyKongScore(kong.player, kong.type, currentScores);
  });

  // Apply adjustments
  adjustments.forEach(adj => {
    currentScores[adj.playerId] += adj.adjustment;
  });

  return {
    id: `score_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    gameId,
    timestamp: Date.now(),
    roundNumber,
    scores: currentScores,
    details: scoreDetails,
    adjustments,
    kongDetails,
    totalScores: currentScores,
    verified: false,
  };
}

/**
 * Verify score sheet accuracy
 * Returns array of any detected errors
 * 
 * @param scoreSheet Score sheet to verify
 * @param expectedTotal Expected total sum (should be 0 for zero-sum game)
 * @returns Array of error messages (empty if valid)
 */
export function verifyScoreSheet(
  scoreSheet: ScoreSheet,
  expectedTotal: number = 0
): string[] {
  const errors: string[] = [];

  // Verify zero-sum
  const positions: PlayerPosition[] = ['东', '南', '西', '北'];
  const total = positions.reduce((sum, pos) => sum + scoreSheet.totalScores[pos], 0);
  
  if (Math.abs(total - expectedTotal) > 0.01) {
    errors.push(`Score sum mismatch: ${total} (expected ${expectedTotal})`);
  }

  // Verify fan limits
  scoreSheet.details.forEach((detail, idx) => {
    if (detail.fan > 5) {
      errors.push(`Win ${idx + 1}: Fan exceeds limit (${detail.fan} > 5)`);
    }
  });

  // Verify kong scores
  scoreSheet.kongDetails.forEach((kong, idx) => {
    const expectedKongScore = calculateKongScore(kong.type);
    if (kong.score !== expectedKongScore) {
      errors.push(`Kong ${idx + 1}: Invalid score (${kong.score}, expected ${expectedKongScore})`);
    }
  });

  return errors;
}

/**
 * Create a score adjustment record
 * 
 * @param playerId Player to adjust
 * @param adjustment Adjustment amount (positive or negative)
 * @param reason Reason for adjustment
 * @param approvedBy Optional approver
 * @returns Score adjustment record
 */
export function createScoreAdjustment(
  playerId: PlayerPosition,
  adjustment: number,
  reason: string,
  approvedBy?: string
): ScoreAdjustment {
  return {
    id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    playerId,
    adjustment,
    reason,
    approvedBy,
  };
}
