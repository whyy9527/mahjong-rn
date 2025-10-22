/**
 * Tests for Game Start Assistant (E4)
 */

import {
  calculateStartingPosition,
  processDiceRoll,
  createDiceEvent,
  validateDiceEvent,
  generateGuidanceMessage,
} from '../services/gameStartAssistant';
import {initializeGame} from '../services/storageService';

describe('Game Start Assistant (E4)', () => {
  describe('calculateStartingPosition', () => {
    it('should calculate starting position correctly', () => {
      const result = calculateStartingPosition(3, 5, '东');
      
      expect(result.minValue).toBe(3);
      expect(result.startPlayer).toBe('西'); // 东 + 3 - 1 = 西
      expect(result.stackNumber).toBe(3);
      expect(result.tileNumber).toBeGreaterThanOrEqual(1);
      expect(result.tileNumber).toBeLessThanOrEqual(2);
      expect(result.guidance).toContain('第3堆');
    });

    it('should use minimum dice value', () => {
      const result1 = calculateStartingPosition(2, 5, '东');
      const result2 = calculateStartingPosition(5, 2, '东');
      
      expect(result1.minValue).toBe(2);
      expect(result2.minValue).toBe(2);
      expect(result1.startPlayer).toBe(result2.startPlayer);
    });

    it('should complete within 400ms KPI', () => {
      const start = performance.now();
      calculateStartingPosition(3, 5, '东');
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(400);
    });

    it('should throw error for invalid dice values', () => {
      expect(() => calculateStartingPosition(0, 5, '东')).toThrow();
      expect(() => calculateStartingPosition(3, 7, '东')).toThrow();
    });

    it('should handle all player positions', () => {
      const positions = ['东', '南', '西', '北'] as const;
      positions.forEach(dealer => {
        const result = calculateStartingPosition(3, 5, dealer);
        expect(result.startPlayer).toBeDefined();
      });
    });
  });

  describe('processDiceRoll', () => {
    it('should update game state with dice roll', () => {
      const gameState = initializeGame('东');
      const diceEvent = createDiceEvent(3, 5);
      
      const updatedState = processDiceRoll(gameState, diceEvent);
      
      expect(updatedState.startingPosition.dice1).toBe(3);
      expect(updatedState.startingPosition.dice2).toBe(5);
      expect(updatedState.startingPosition.minValue).toBe(3);
      expect(updatedState.diceEvents).toHaveLength(1);
      expect(updatedState.status).toBe('playing');
    });
  });

  describe('createDiceEvent', () => {
    it('should create dice event with correct properties', () => {
      const event = createDiceEvent(3, 5, 'manual', 1.0);
      
      expect(event.dice1).toBe(3);
      expect(event.dice2).toBe(5);
      expect(event.minValue).toBe(3);
      expect(event.detectionMethod).toBe('manual');
      expect(event.confidence).toBe(1.0);
      expect(event.id).toMatch(/^dice_/);
      expect(event.timestamp).toBeGreaterThan(0);
    });

    it('should create CV dice event with image data', () => {
      const event = createDiceEvent(3, 5, 'cv', 0.99, 'base64image');
      
      expect(event.detectionMethod).toBe('cv');
      expect(event.confidence).toBe(0.99);
      expect(event.cvImageData).toBe('base64image');
    });
  });

  describe('validateDiceEvent', () => {
    it('should accept manual dice events', () => {
      const event = createDiceEvent(3, 5, 'manual', 1.0);
      expect(validateDiceEvent(event)).toBe(true);
    });

    it('should accept CV events with ≥98% confidence', () => {
      const event = createDiceEvent(3, 5, 'cv', 0.98);
      expect(validateDiceEvent(event)).toBe(true);
    });

    it('should reject CV events with <98% confidence', () => {
      const event = createDiceEvent(3, 5, 'cv', 0.97);
      expect(validateDiceEvent(event)).toBe(false);
    });

    it('should accept voice events with ≥95% confidence', () => {
      const event = createDiceEvent(3, 5, 'voice', 0.95);
      expect(validateDiceEvent(event)).toBe(true);
    });
  });

  describe('generateGuidanceMessage', () => {
    it('should generate correct guidance message', () => {
      const message = generateGuidanceMessage({
        startPlayer: '东',
        stackNumber: 3,
        tileNumber: 1,
      });
      
      expect(message).toContain('东家');
      expect(message).toContain('第3堆');
      expect(message).toContain('第1张');
    });
  });

  describe('E2E: Start Position Flow', () => {
    it('should complete full start position flow within 400ms', async () => {
      const start = performance.now();
      
      // Initialize game
      const gameState = initializeGame('东');
      
      // Create dice event
      const diceEvent = createDiceEvent(3, 5, 'manual', 1.0);
      
      // Process dice roll
      const updatedState = processDiceRoll(gameState, diceEvent);
      
      // Generate guidance
      const guidance = generateGuidanceMessage(updatedState.startingPosition);
      
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(400);
      expect(updatedState.status).toBe('playing');
      expect(guidance).toBeTruthy();
    });
  });
});
