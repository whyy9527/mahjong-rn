/**
 * E4: Game Start Assistant
 * Handles dice rolling and starting position calculation
 * KPI: Starting position calculation ≤ 400ms
 */

import {DiceEvent, PlayerPosition, GameState} from '../types';

/**
 * Player position order (clockwise)
 */
const POSITION_ORDER: PlayerPosition[] = ['东', '南', '西', '北'];

/**
 * Calculate starting position based on dice roll
 * Rules: Use minimum of two dice to determine starting player and position
 * 
 * @param dice1 First die value (1-6)
 * @param dice2 Second die value (1-6)
 * @param dealer Current dealer position
 * @returns Starting position details
 */
export function calculateStartingPosition(
  dice1: number,
  dice2: number,
  dealer: PlayerPosition
): {
  minValue: number;
  startPlayer: PlayerPosition;
  stackNumber: number;
  tileNumber: number;
  guidance: string;
} {
  const startTime = performance.now();

  // Validate dice values
  if (dice1 < 1 || dice1 > 6 || dice2 < 1 || dice2 > 6) {
    throw new Error('Dice values must be between 1 and 6');
  }

  // Use minimum value to determine starting position
  const minValue = Math.min(dice1, dice2);
  const sum = dice1 + dice2;

  // Determine starting player (count counterclockwise from dealer)
  const dealerIndex = POSITION_ORDER.indexOf(dealer);
  const startPlayerIndex = (dealerIndex + minValue - 1) % 4;
  const startPlayer = POSITION_ORDER[startPlayerIndex];

  // Calculate stack and tile numbers
  // Each player has stacks numbered from their right
  // Stack calculation: minValue determines which stack (from right)
  const stackNumber = minValue;
  
  // Tile number within stack (each stack has 2 tiles)
  // Sum determines offset within the counting
  const tileNumber = ((sum - 1) % 2) + 1;

  const guidance = `第${stackNumber}堆第${tileNumber}张`;

  const endTime = performance.now();
  const processingTime = endTime - startTime;

  // KPI check: must be ≤ 400ms
  if (processingTime > 400) {
    console.warn(`Starting position calculation exceeded KPI: ${processingTime}ms`);
  }

  return {
    minValue,
    startPlayer,
    stackNumber,
    tileNumber,
    guidance,
  };
}

/**
 * Process dice event and update game state
 * 
 * @param gameState Current game state
 * @param diceEvent Dice event to process
 * @returns Updated game state
 */
export function processDiceRoll(
  gameState: GameState,
  diceEvent: DiceEvent
): GameState {
  const startPosition = calculateStartingPosition(
    diceEvent.dice1,
    diceEvent.dice2,
    gameState.dealer
  );

  return {
    ...gameState,
    startingPosition: {
      dice1: diceEvent.dice1,
      dice2: diceEvent.dice2,
      minValue: startPosition.minValue,
      startPlayer: startPosition.startPlayer,
      stackNumber: startPosition.stackNumber,
      tileNumber: startPosition.tileNumber,
    },
    diceEvents: [...gameState.diceEvents, diceEvent],
    status: 'playing',
  };
}

/**
 * Create a dice event from manual input or CV detection
 * 
 * @param dice1 First die value
 * @param dice2 Second die value
 * @param method Detection method
 * @param confidence Detection confidence
 * @param cvImageData Optional CV image data
 * @returns Dice event
 */
export function createDiceEvent(
  dice1: number,
  dice2: number,
  method: 'manual' | 'cv' | 'voice' = 'manual',
  confidence: number = 1.0,
  cvImageData?: string
): DiceEvent {
  return {
    id: `dice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    dice1,
    dice2,
    minValue: Math.min(dice1, dice2),
    detectionMethod: method,
    confidence,
    cvImageData,
  };
}

/**
 * Validate dice event meets accuracy KPI
 * CV dice detection must be ≥ 98% accurate
 * 
 * @param diceEvent Dice event to validate
 * @returns Whether the event meets accuracy requirements
 */
export function validateDiceEvent(diceEvent: DiceEvent): boolean {
  // Manual input is always accepted
  if (diceEvent.detectionMethod === 'manual') {
    return true;
  }

  // CV detection must meet 98% confidence threshold
  if (diceEvent.detectionMethod === 'cv') {
    return diceEvent.confidence >= 0.98;
  }

  // Voice detection should be high confidence
  if (diceEvent.detectionMethod === 'voice') {
    return diceEvent.confidence >= 0.95;
  }

  return false;
}

/**
 * Generate guidance message for players
 * 
 * @param startPosition Starting position details
 * @returns Human-readable guidance message
 */
export function generateGuidanceMessage(startPosition: {
  startPlayer: PlayerPosition;
  stackNumber: number;
  tileNumber: number;
}): string {
  return `${startPosition.startPlayer}家起牌，从右数第${startPosition.stackNumber}堆第${startPosition.tileNumber}张开始`;
}
