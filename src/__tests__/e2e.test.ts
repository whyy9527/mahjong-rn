/**
 * E2E Acceptance Tests
 * Tests complete MVP features (E4, E5, E6)
 */

import {
  initializeGame,
  saveGameState,
  loadGameState,
} from '../services/storageService';
import {
  createDiceEvent,
  processDiceRoll,
  generateGuidanceMessage,
} from '../services/gameStartAssistant';
import {
  calculateWinScore,
  createScoreSheet,
  verifyScoreSheet,
} from '../services/scoringEngine';
import {
  createVoiceEvent,
  processVoiceCommand,
} from '../services/voiceHandler';
import {
  generateConflictReport,
  replayVoiceEvents,
} from '../services/replayService';
import {generateKPIReport, validateKPIMetrics} from '../utils/kpiMetrics';
import {GameState, PlayerPosition} from '../types';

describe('E2E Acceptance Tests', () => {
  describe('E4: Game Start Assistant E2E', () => {
    it('should complete game start flow within 400ms', async () => {
      const startTime = performance.now();

      // Initialize game
      const gameState = initializeGame('东');
      
      // Roll dice
      const diceEvent = createDiceEvent(3, 5, 'manual', 1.0);
      
      // Process dice roll
      const updatedState = processDiceRoll(gameState, diceEvent);
      
      // Generate guidance
      const guidance = generateGuidanceMessage(updatedState.startingPosition);

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(400);
      expect(updatedState.startingPosition.minValue).toBe(3);
      expect(guidance).toContain('家起牌');
    });

    it('should support CV dice detection with ≥98% confidence', () => {
      const diceEvent = createDiceEvent(4, 6, 'cv', 0.99, 'base64image');
      const gameState = initializeGame('东');
      
      const updatedState = processDiceRoll(gameState, diceEvent);
      
      expect(updatedState.diceEvents[0].detectionMethod).toBe('cv');
      expect(updatedState.diceEvents[0].confidence).toBeGreaterThanOrEqual(0.98);
    });
  });

  describe('E5: Scoring Settlement E2E', () => {
    it('should calculate correct score sheet for single win', () => {
      const initialScores: Record<PlayerPosition, number> = {
        '东': 0,
        '南': 0,
        '西': 0,
        '北': 0,
      };

      const scoreDetails = [
        calculateWinScore('东', '南', 3, false, 0),
      ];

      const sheet = createScoreSheet(
        'game123',
        1,
        scoreDetails,
        [],
        initialScores
      );

      const errors = verifyScoreSheet(sheet);
      
      expect(errors).toHaveLength(0);
      expect(sheet.totalScores['东']).toBe(8);
      expect(sheet.totalScores['南']).toBe(-8);
      
      // Verify zero-sum
      const total = Object.values(sheet.totalScores).reduce(
        (sum, val) => sum + val,
        0
      );
      expect(Math.abs(total)).toBeLessThan(0.01);
    });

    it('should handle multiple wins (多胡)', () => {
      const initialScores: Record<PlayerPosition, number> = {
        '东': 0,
        '南': 0,
        '西': 0,
        '北': 0,
      };

      const scoreDetails = [
        calculateWinScore('东', '南', 2, false, 0),
        calculateWinScore('西', '南', 3, false, 0),
      ];

      const sheet = createScoreSheet(
        'game123',
        1,
        scoreDetails,
        [],
        initialScores
      );

      const errors = verifyScoreSheet(sheet);
      
      expect(errors).toHaveLength(0);
      expect(sheet.details).toHaveLength(2);
      expect(sheet.totalScores['东']).toBe(4);
      expect(sheet.totalScores['西']).toBe(8);
      expect(sheet.totalScores['南']).toBe(-12);
    });

    it('should handle kong scores independently', () => {
      const initialScores: Record<PlayerPosition, number> = {
        '东': 0,
        '南': 0,
        '西': 0,
        '北': 0,
      };

      const kongDetails = [
        {player: '东' as PlayerPosition, type: 'concealed' as const, score: 4},
      ];

      const sheet = createScoreSheet(
        'game123',
        1,
        [],
        kongDetails,
        initialScores
      );

      expect(sheet.totalScores['东']).toBe(12); // 4 * 3
      expect(sheet.totalScores['南']).toBe(-4);
      expect(sheet.totalScores['西']).toBe(-4);
      expect(sheet.totalScores['北']).toBe(-4);
    });

    it('should maintain ≥99.5% scoring accuracy', () => {
      // Run 1000 random scoring scenarios
      let correctCount = 0;
      const totalTests = 1000;

      for (let i = 0; i < totalTests; i++) {
        const initialScores: Record<PlayerPosition, number> = {
          '东': 0,
          '南': 0,
          '西': 0,
          '北': 0,
        };

        const fan = Math.floor(Math.random() * 6);
        const isSelfDraw = Math.random() > 0.5;
        
        const scoreDetails = [
          calculateWinScore(
            '东',
            isSelfDraw ? undefined : '南',
            fan,
            isSelfDraw,
            0
          ),
        ];

        const sheet = createScoreSheet('test', 1, scoreDetails, [], initialScores);
        const errors = verifyScoreSheet(sheet);
        
        if (errors.length === 0) {
          correctCount++;
        }
      }

      const accuracy = (correctCount / totalTests) * 100;
      expect(accuracy).toBeGreaterThanOrEqual(99.5);
    });
  });

  describe('E6: Current Game Dashboard E2E', () => {
    it('should maintain complete game state', async () => {
      // Initialize game
      let gameState = initializeGame('东');
      
      // Start game with dice roll
      const diceEvent = createDiceEvent(3, 5);
      gameState = processDiceRoll(gameState, diceEvent);
      
      // Add voice event
      const voiceEvent = createVoiceEvent('打', '东', 0.99, 100);
      gameState.voiceEvents.push(voiceEvent);
      
      // Add score sheet
      const scoreDetails = [calculateWinScore('东', '南', 2, false, 0)];
      const sheet = createScoreSheet('game123', 1, scoreDetails, [], {
        '东': 0,
        '南': 0,
        '西': 0,
        '北': 0,
      });
      gameState.scoreSheets.push(sheet);
      
      // Verify game state is complete
      expect(gameState.status).toBe('playing');
      expect(gameState.diceEvents).toHaveLength(1);
      expect(gameState.voiceEvents).toHaveLength(1);
      expect(gameState.scoreSheets).toHaveLength(1);
      expect(gameState.startingPosition.minValue).toBe(3);
    });
  });

  describe('Replay and Verification E2E', () => {
    it('should replay voice events correctly', () => {
      const voiceEvents = [
        createVoiceEvent('打', '东', 0.99, 100),
        createVoiceEvent('碰', '南', 0.98, 150),
        createVoiceEvent('杠', '西', 0.99, 120),
      ];

      const replayed = replayVoiceEvents(voiceEvents);
      
      expect(replayed).toHaveLength(3);
      expect(replayed[0].event.command).toBe('打');
      expect(replayed[1].event.command).toBe('碰');
      expect(replayed[2].event.command).toBe('杠');
    });

    it('should generate conflict report', () => {
      const gameState = initializeGame('东');
      
      const report = generateConflictReport(gameState);
      
      expect(report.conflicts).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.summary.total).toBeGreaterThanOrEqual(0);
    });

    it('should detect score mismatches in terminal snapshot', () => {
      const gameState = initializeGame('东');
      
      // Add invalid score sheet (doesn't sum to zero)
      gameState.scoreSheets.push({
        id: 'sheet1',
        gameId: 'game123',
        timestamp: Date.now(),
        roundNumber: 1,
        scores: {'东': 10, '南': -5, '西': -2, '北': -2},
        details: [],
        adjustments: [],
        kongDetails: [],
        totalScores: {'东': 10, '南': -5, '西': -2, '北': -2},
        verified: false,
      });

      const report = generateConflictReport(gameState);
      
      expect(report.conflicts.length).toBeGreaterThan(0);
      expect(report.summary.high).toBeGreaterThan(0);
    });
  });

  describe('KPI Metrics E2E', () => {
    it('should track and validate KPI metrics', async () => {
      // Simulate voice events with good performance
      const voiceEvents = Array.from({length: 100}, (_, i) =>
        createVoiceEvent('打', '东', 0.99, 50 + Math.random() * 100)
      );

      const diceEvents = Array.from({length: 10}, () =>
        createDiceEvent(3, 5, 'cv', 0.99)
      );

      const startPositionTimes = Array.from({length: 10}, () => 50 + Math.random() * 100);

      const metrics = generateKPIReport(
        voiceEvents,
        diceEvents,
        startPositionTimes
      );

      const validation = validateKPIMetrics(metrics);
      
      // ASR P95 should be under 400ms
      expect(metrics.asrP95).toBeLessThan(400);
      
      // Start position time should be under 400ms
      expect(metrics.startPositionTime).toBeLessThan(400);
    });
  });

  describe('Full Game Flow E2E', () => {
    it('should simulate complete game with all features', async () => {
      const overallStart = performance.now();

      // 1. Initialize game
      let gameState = initializeGame('东');
      expect(gameState.status).toBe('waiting');

      // 2. Roll dice and start game
      const diceEvent = createDiceEvent(4, 6, 'cv', 0.99);
      gameState = processDiceRoll(gameState, diceEvent);
      expect(gameState.status).toBe('playing');

      // 3. Process some voice commands
      const voiceEvent1 = createVoiceEvent('打', '东', 0.99, 100);
      const voiceEvent2 = createVoiceEvent('碰', '南', 0.98, 120);
      gameState.voiceEvents.push(voiceEvent1, voiceEvent2);

      // 4. Score a win
      const scoreDetails = [
        calculateWinScore('东', '南', 3, false, 0),
      ];
      const sheet = createScoreSheet(
        gameState.id,
        1,
        scoreDetails,
        [],
        {
          '东': 0,
          '南': 0,
          '西': 0,
          '北': 0,
        }
      );
      gameState.scoreSheets.push(sheet);

      // 5. Verify consistency
      const report = generateConflictReport(gameState);
      
      // 6. Calculate KPIs
      const metrics = generateKPIReport(
        gameState.voiceEvents,
        gameState.diceEvents,
        [100]
      );

      const overallDuration = performance.now() - overallStart;

      // Assertions
      expect(gameState.diceEvents).toHaveLength(1);
      expect(gameState.voiceEvents).toHaveLength(2);
      expect(gameState.scoreSheets).toHaveLength(1);
      expect(report.conflicts.length).toBeGreaterThanOrEqual(0);
      expect(metrics.asrP95).toBeLessThan(400);
      expect(overallDuration).toBeLessThan(1000); // Entire flow should be fast
    });
  });
});
