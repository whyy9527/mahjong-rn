/**
 * Voice Command Handler
 * Processes voice commands with ASR
 * KPI: ASR P95 ≤ 400ms, Accuracy ≥ 99% (noisy ≥ 97%)
 */

import {VoiceEvent, VoiceCommandType, PlayerPosition} from '../types';

/**
 * Valid voice commands
 */
const VALID_COMMANDS: VoiceCommandType[] = [
  '打',
  '碰',
  '杠',
  '胡',
  '自摸',
  '点炮',
  '报骰',
];

/**
 * Simulate ASR processing (in production, this would call actual ASR service)
 * 
 * @param audioData Base64 encoded audio
 * @param isNoisy Whether environment is noisy
 * @returns Recognized command and confidence
 */
export async function processVoiceCommand(
  audioData: string,
  isNoisy: boolean = false
): Promise<{command: VoiceCommandType; confidence: number; processingTime: number}> {
  const startTime = performance.now();

  // Simulate ASR processing delay (50-200ms typically)
  await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150));

  // In production, this would be actual ASR
  // For now, we'll simulate recognition
  
  // Simulate accuracy based on environment
  const baseAccuracy = isNoisy ? 0.97 : 0.99;
  const confidence = baseAccuracy + (Math.random() * (1 - baseAccuracy));

  // For simulation, return a random valid command
  const command = VALID_COMMANDS[Math.floor(Math.random() * VALID_COMMANDS.length)];

  const endTime = performance.now();
  const processingTime = endTime - startTime;

  // KPI check: P95 should be ≤ 400ms
  if (processingTime > 400) {
    console.warn(`Voice processing exceeded KPI: ${processingTime}ms`);
  }

  return {command, confidence, processingTime};
}

/**
 * Create a voice event from processed command
 * 
 * @param command Recognized command
 * @param playerId Player who issued command
 * @param confidence ASR confidence
 * @param processingTime Time taken to process
 * @param audioData Optional audio data
 * @returns Voice event
 */
export function createVoiceEvent(
  command: VoiceCommandType,
  playerId: PlayerPosition,
  confidence: number,
  processingTime: number,
  audioData?: string
): VoiceEvent {
  return {
    id: `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    command,
    playerId,
    confidence,
    audioData,
    processingTime,
  };
}

/**
 * Validate voice event meets accuracy KPI
 * 
 * @param voiceEvent Voice event to validate
 * @param isNoisy Whether environment is noisy
 * @returns Whether event meets KPI requirements
 */
export function validateVoiceEvent(
  voiceEvent: VoiceEvent,
  isNoisy: boolean = false
): boolean {
  const requiredConfidence = isNoisy ? 0.97 : 0.99;
  return voiceEvent.confidence >= requiredConfidence;
}

/**
 * Parse voice command to determine action type
 * 
 * @param command Voice command
 * @returns Action type or null if not an action
 */
export function parseCommandToAction(
  command: VoiceCommandType
): 'discard' | 'pong' | 'kong' | 'win' | 'self-draw' | null {
  switch (command) {
    case '打':
      return 'discard';
    case '碰':
      return 'pong';
    case '杠':
      return 'kong';
    case '胡':
    case '点炮':
      return 'win';
    case '自摸':
      return 'self-draw';
    default:
      return null;
  }
}

/**
 * Batch process multiple voice events
 * Useful for replay scenarios
 * 
 * @param audioDataArray Array of audio data to process
 * @param isNoisy Whether environment is noisy
 * @returns Array of processed voice commands
 */
export async function batchProcessVoiceCommands(
  audioDataArray: string[],
  isNoisy: boolean = false
): Promise<Array<{command: VoiceCommandType; confidence: number; processingTime: number}>> {
  const results = await Promise.all(
    audioDataArray.map(audioData => processVoiceCommand(audioData, isNoisy))
  );
  return results;
}

/**
 * Calculate P95 processing time from array of voice events
 * KPI tracking
 * 
 * @param voiceEvents Array of voice events
 * @returns P95 processing time in ms
 */
export function calculateP95ProcessingTime(voiceEvents: VoiceEvent[]): number {
  if (voiceEvents.length === 0) return 0;

  const sortedTimes = voiceEvents
    .map(e => e.processingTime)
    .sort((a, b) => a - b);

  const p95Index = Math.ceil(sortedTimes.length * 0.95) - 1;
  return sortedTimes[p95Index];
}

/**
 * Calculate accuracy from voice events
 * For KPI tracking - requires ground truth data
 * 
 * @param voiceEvents Voice events to analyze
 * @param groundTruth Ground truth commands (for testing)
 * @returns Accuracy percentage
 */
export function calculateAccuracy(
  voiceEvents: VoiceEvent[],
  groundTruth: VoiceCommandType[]
): number {
  if (voiceEvents.length === 0 || groundTruth.length === 0) return 0;
  if (voiceEvents.length !== groundTruth.length) {
    throw new Error('Voice events and ground truth must have same length');
  }

  const correct = voiceEvents.filter(
    (event, idx) => event.command === groundTruth[idx]
  ).length;

  return (correct / voiceEvents.length) * 100;
}
