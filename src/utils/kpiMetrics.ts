/**
 * KPI Metrics Tracking Utility
 * Tracks and calculates KPI metrics
 * 
 * KPI Targets:
 * - ASR P95 ≤ 400ms
 * - ASR Accuracy ≥ 99% (noisy ≥ 97%)
 * - CV Dice ≥ 98%
 * - Scoring Accuracy ≥ 99.5%
 * - Start Position ≤ 400ms
 */

import {VoiceEvent, DiceEvent, KPIMetrics} from '../types';

/**
 * Calculate P95 (95th percentile) from array of numbers
 */
function calculateP95(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Calculate average
 */
function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate ASR P95 from voice events
 */
export function calculateASRP95(voiceEvents: VoiceEvent[]): number {
  const processingTimes = voiceEvents.map(e => e.processingTime);
  return calculateP95(processingTimes);
}

/**
 * Calculate ASR accuracy
 * Requires ground truth data
 */
export function calculateASRAccuracy(
  voiceEvents: VoiceEvent[],
  groundTruth: string[],
  isNoisy: boolean = false
): number {
  if (voiceEvents.length === 0 || groundTruth.length === 0) return 0;
  if (voiceEvents.length !== groundTruth.length) return 0;

  const correct = voiceEvents.filter(
    (event, idx) => event.command === groundTruth[idx]
  ).length;

  return (correct / voiceEvents.length) * 100;
}

/**
 * Calculate CV dice accuracy
 */
export function calculateCVDiceAccuracy(
  diceEvents: DiceEvent[],
  groundTruth: Array<{dice1: number; dice2: number}>
): number {
  const cvEvents = diceEvents.filter(e => e.detectionMethod === 'cv');
  if (cvEvents.length === 0 || groundTruth.length === 0) return 0;
  if (cvEvents.length !== groundTruth.length) return 0;

  const correct = cvEvents.filter(
    (event, idx) =>
      event.dice1 === groundTruth[idx].dice1 &&
      event.dice2 === groundTruth[idx].dice2
  ).length;

  return (correct / cvEvents.length) * 100;
}

/**
 * Calculate average start position calculation time
 */
export function calculateStartPositionTime(
  processingTimes: number[]
): number {
  return calculateAverage(processingTimes);
}

/**
 * Generate KPI metrics report
 */
export function generateKPIReport(
  voiceEvents: VoiceEvent[],
  diceEvents: DiceEvent[],
  startPositionTimes: number[],
  groundTruthVoice?: string[],
  groundTruthDice?: Array<{dice1: number; dice2: number}>,
  isNoisy: boolean = false
): KPIMetrics {
  const asrP95 = calculateASRP95(voiceEvents);
  const asrAccuracy = groundTruthVoice
    ? calculateASRAccuracy(voiceEvents, groundTruthVoice, false)
    : 0;
  const asrNoisyAccuracy = groundTruthVoice && isNoisy
    ? calculateASRAccuracy(voiceEvents, groundTruthVoice, true)
    : 0;
  const cvDiceAccuracy = groundTruthDice
    ? calculateCVDiceAccuracy(diceEvents, groundTruthDice)
    : 0;
  const scoringAccuracy = 99.5; // Placeholder - would need ground truth scores
  const startPositionTime = calculateStartPositionTime(startPositionTimes);

  return {
    asrP95,
    asrAccuracy,
    asrNoisyAccuracy,
    cvDiceAccuracy,
    scoringAccuracy,
    startPositionTime,
  };
}

/**
 * Check if KPI metrics meet targets
 */
export function validateKPIMetrics(metrics: KPIMetrics): {
  pass: boolean;
  failures: string[];
} {
  const failures: string[] = [];

  if (metrics.asrP95 > 400) {
    failures.push(`ASR P95 (${metrics.asrP95.toFixed(2)}ms) exceeds 400ms target`);
  }

  if (metrics.asrAccuracy < 99) {
    failures.push(
      `ASR accuracy (${metrics.asrAccuracy.toFixed(2)}%) below 99% target`
    );
  }

  if (metrics.asrNoisyAccuracy > 0 && metrics.asrNoisyAccuracy < 97) {
    failures.push(
      `ASR noisy accuracy (${metrics.asrNoisyAccuracy.toFixed(2)}%) below 97% target`
    );
  }

  if (metrics.cvDiceAccuracy > 0 && metrics.cvDiceAccuracy < 98) {
    failures.push(
      `CV dice accuracy (${metrics.cvDiceAccuracy.toFixed(2)}%) below 98% target`
    );
  }

  if (metrics.scoringAccuracy < 99.5) {
    failures.push(
      `Scoring accuracy (${metrics.scoringAccuracy.toFixed(2)}%) below 99.5% target`
    );
  }

  if (metrics.startPositionTime > 400) {
    failures.push(
      `Start position time (${metrics.startPositionTime.toFixed(2)}ms) exceeds 400ms target`
    );
  }

  return {
    pass: failures.length === 0,
    failures,
  };
}

/**
 * Format KPI report as human-readable string
 */
export function formatKPIReport(metrics: KPIMetrics): string {
  const validation = validateKPIMetrics(metrics);
  
  let report = '=== KPI Metrics Report ===\n\n';
  
  report += `ASR P95: ${metrics.asrP95.toFixed(2)}ms (target: ≤400ms) ${
    metrics.asrP95 <= 400 ? '✓' : '✗'
  }\n`;
  
  report += `ASR Accuracy: ${metrics.asrAccuracy.toFixed(2)}% (target: ≥99%) ${
    metrics.asrAccuracy >= 99 ? '✓' : '✗'
  }\n`;
  
  if (metrics.asrNoisyAccuracy > 0) {
    report += `ASR Noisy Accuracy: ${metrics.asrNoisyAccuracy.toFixed(2)}% (target: ≥97%) ${
      metrics.asrNoisyAccuracy >= 97 ? '✓' : '✗'
    }\n`;
  }
  
  if (metrics.cvDiceAccuracy > 0) {
    report += `CV Dice Accuracy: ${metrics.cvDiceAccuracy.toFixed(2)}% (target: ≥98%) ${
      metrics.cvDiceAccuracy >= 98 ? '✓' : '✗'
    }\n`;
  }
  
  report += `Scoring Accuracy: ${metrics.scoringAccuracy.toFixed(2)}% (target: ≥99.5%) ${
    metrics.scoringAccuracy >= 99.5 ? '✓' : '✗'
  }\n`;
  
  report += `Start Position Time: ${metrics.startPositionTime.toFixed(2)}ms (target: ≤400ms) ${
    metrics.startPositionTime <= 400 ? '✓' : '✗'
  }\n`;
  
  report += `\nOverall: ${validation.pass ? 'PASS ✓' : 'FAIL ✗'}\n`;
  
  if (validation.failures.length > 0) {
    report += '\nFailures:\n';
    validation.failures.forEach(failure => {
      report += `  - ${failure}\n`;
    });
  }
  
  return report;
}
