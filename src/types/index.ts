/**
 * Data Contracts for Mahjong AI Assistant
 * Offline-first, local storage with optional sync
 */

/**
 * Voice command types
 */
export type VoiceCommandType =
  | '打' // Discard
  | '碰' // Pong
  | '杠' // Kong
  | '胡' // Win
  | '自摸' // Self-draw win
  | '点炮' // Win on discard
  | '报骰'; // Announce dice

/**
 * Voice Event - captures voice commands with timestamp and metadata
 */
export interface VoiceEvent {
  id: string;
  timestamp: number; // Unix timestamp in ms
  command: VoiceCommandType;
  playerId: string; // Player identifier (东/南/西/北)
  confidence: number; // ASR confidence score (0-1)
  audioData?: string; // Base64 encoded audio for replay
  processingTime: number; // Time taken to process in ms (for KPI tracking)
}

/**
 * Dice Event - captures dice roll results
 */
export interface DiceEvent {
  id: string;
  timestamp: number;
  dice1: number; // Value 1-6
  dice2: number; // Value 1-6
  minValue: number; // Minimum of dice1 and dice2
  detectionMethod: 'manual' | 'cv' | 'voice'; // How dice were detected
  confidence: number; // CV confidence if applicable
  cvImageData?: string; // Base64 encoded image for CV verification
}

/**
 * CV Snapshot - computer vision snapshot for verification
 */
export interface CVSnapshot {
  id: string;
  timestamp: number;
  imageData: string; // Base64 encoded image
  detectedTiles?: string[]; // Detected mahjong tiles
  confidence: number;
  purpose: 'dice' | 'tiles' | 'verification'; // Purpose of snapshot
}

/**
 * Player position
 */
export type PlayerPosition = '东' | '南' | '西' | '北';

/**
 * Action types
 */
export type ActionType = 'discard' | 'pong' | 'kong' | 'win' | 'self-draw';

/**
 * Kong types
 */
export type KongType = 'concealed' | 'exposed' | 'add'; // 暗杠/明杠/加杠

/**
 * Game action record
 */
export interface GameAction {
  id: string;
  timestamp: number;
  playerId: PlayerPosition;
  actionType: ActionType;
  tile?: string;
  kongType?: KongType;
  voiceEventId?: string; // Reference to voice event
}

/**
 * Score detail for a single win
 */
export interface ScoreDetail {
  winner: PlayerPosition;
  loser?: PlayerPosition; // undefined for self-draw
  fan: number; // 番数 (max 5)
  isSelfDraw: boolean;
  kongScore: number; // Independent kong score
  baseScore: number;
  totalScore: number;
  multiplier: number;
}

/**
 * Score adjustment/correction record
 */
export interface ScoreAdjustment {
  id: string;
  timestamp: number;
  reason: string;
  playerId: PlayerPosition;
  adjustment: number;
  approvedBy?: string;
}

/**
 * Score Sheet - final settlement record
 */
export interface ScoreSheet {
  id: string;
  gameId: string;
  timestamp: number;
  roundNumber: number;
  scores: Record<PlayerPosition, number>; // Current scores for each player
  details: ScoreDetail[]; // Multiple wins possible
  adjustments: ScoreAdjustment[]; // Corrections and adjustments
  kongDetails: {
    player: PlayerPosition;
    type: KongType;
    score: number;
  }[];
  totalScores: Record<PlayerPosition, number>; // Running total
  verified: boolean; // Whether scores have been verified
}

/**
 * Game state
 */
export interface GameState {
  id: string;
  createdAt: number;
  currentRound: number;
  dealer: PlayerPosition;
  startingPosition: {
    dice1: number;
    dice2: number;
    minValue: number;
    startPlayer: PlayerPosition;
    stackNumber: number; // Which stack to start from
    tileNumber: number; // Which tile in the stack
  };
  players: Record<PlayerPosition, {
    name?: string;
    score: number;
    isDealer: boolean;
  }>;
  actions: GameAction[];
  voiceEvents: VoiceEvent[];
  diceEvents: DiceEvent[];
  cvSnapshots: CVSnapshot[];
  scoreSheets: ScoreSheet[];
  status: 'waiting' | 'playing' | 'scoring' | 'finished';
}

/**
 * Replay conflict - inconsistencies detected during replay
 */
export interface ReplayConflict {
  id: string;
  timestamp: number;
  type: 'score_mismatch' | 'action_order' | 'missing_event' | 'duplicate_action';
  description: string;
  severity: 'low' | 'medium' | 'high';
  affectedEvents: string[]; // IDs of related events
  suggestedResolution?: string;
}

/**
 * KPI Metrics for monitoring
 */
export interface KPIMetrics {
  asrP95: number; // ASR processing time P95 in ms
  asrAccuracy: number; // Overall accuracy percentage
  asrNoisyAccuracy: number; // Accuracy in noisy environment
  cvDiceAccuracy: number; // CV dice detection accuracy
  scoringAccuracy: number; // Scoring correctness percentage
  startPositionTime: number; // Average start position calculation time in ms
}
