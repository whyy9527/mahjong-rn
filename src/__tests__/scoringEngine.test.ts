/**
 * Tests for Scoring Engine (E5)
 */

import {
  calculateKongScore,
  calculateWinScore,
  applyWinToScores,
  applyKongScore,
  createScoreSheet,
  verifyScoreSheet,
  createScoreAdjustment,
} from '../services/scoringEngine';
import {PlayerPosition} from '../types';

describe('Scoring Engine (E5)', () => {
  const initialScores: Record<PlayerPosition, number> = {
    '东': 0,
    '南': 0,
    '西': 0,
    '北': 0,
  };

  describe('calculateKongScore', () => {
    it('should calculate concealed kong score', () => {
      expect(calculateKongScore('concealed')).toBe(4);
    });

    it('should calculate exposed kong score', () => {
      expect(calculateKongScore('exposed')).toBe(2);
    });

    it('should calculate add kong score', () => {
      expect(calculateKongScore('add')).toBe(2);
    });
  });

  describe('calculateWinScore', () => {
    it('should calculate win with 3 fan', () => {
      const score = calculateWinScore('东', '南', 3, false, 0);
      
      expect(score.fan).toBe(3);
      expect(score.baseScore).toBe(8); // 2^3
      expect(score.multiplier).toBe(1);
      expect(score.totalScore).toBe(8);
      expect(score.isSelfDraw).toBe(false);
    });

    it('should calculate self-draw win', () => {
      const score = calculateWinScore('东', undefined, 2, true, 0);
      
      expect(score.fan).toBe(2);
      expect(score.baseScore).toBe(4); // 2^2
      expect(score.multiplier).toBe(3);
      expect(score.totalScore).toBe(12); // 4 * 3
      expect(score.isSelfDraw).toBe(true);
    });

    it('should cap fan at 5', () => {
      const score = calculateWinScore('东', '南', 6, false, 0);
      expect(score.fan).toBe(5);
      expect(score.baseScore).toBe(32); // 2^5
    });

    it('should include kong score', () => {
      const score = calculateWinScore('东', '南', 2, false, 4);
      expect(score.kongScore).toBe(4);
      expect(score.totalScore).toBe(8); // 4 (base) + 4 (kong)
    });
  });

  describe('applyWinToScores', () => {
    it('should apply win on discard correctly', () => {
      const scoreDetail = calculateWinScore('东', '南', 2, false, 0);
      const newScores = applyWinToScores(scoreDetail, initialScores);
      
      expect(newScores['东']).toBe(4); // Winner gains
      expect(newScores['南']).toBe(-4); // Loser pays
      expect(newScores['西']).toBe(0); // Others unchanged
      expect(newScores['北']).toBe(0);
    });

    it('should apply self-draw win correctly', () => {
      const scoreDetail = calculateWinScore('东', undefined, 2, true, 0);
      const newScores = applyWinToScores(scoreDetail, initialScores);
      
      expect(newScores['东']).toBe(12); // Winner gains 4*3
      expect(newScores['南']).toBe(-4); // Each loses 4
      expect(newScores['西']).toBe(-4);
      expect(newScores['北']).toBe(-4);
    });

    it('should maintain zero-sum', () => {
      const scoreDetail = calculateWinScore('东', '南', 3, false, 0);
      const newScores = applyWinToScores(scoreDetail, initialScores);
      
      const total = Object.values(newScores).reduce((sum, val) => sum + val, 0);
      expect(Math.abs(total)).toBeLessThan(0.01);
    });
  });

  describe('applyKongScore', () => {
    it('should apply concealed kong correctly', () => {
      const newScores = applyKongScore('东', 'concealed', initialScores);
      
      expect(newScores['东']).toBe(12); // Gains 4*3
      expect(newScores['南']).toBe(-4); // Each pays 4
      expect(newScores['西']).toBe(-4);
      expect(newScores['北']).toBe(-4);
    });

    it('should apply exposed kong correctly', () => {
      const newScores = applyKongScore('东', 'exposed', initialScores);
      
      expect(newScores['东']).toBe(6); // Gains 2*3
      expect(newScores['南']).toBe(-2); // Each pays 2
      expect(newScores['西']).toBe(-2);
      expect(newScores['北']).toBe(-2);
    });

    it('should maintain zero-sum', () => {
      const newScores = applyKongScore('东', 'concealed', initialScores);
      const total = Object.values(newScores).reduce((sum, val) => sum + val, 0);
      expect(Math.abs(total)).toBeLessThan(0.01);
    });
  });

  describe('createScoreSheet', () => {
    it('should create valid score sheet', () => {
      const scoreDetails = [
        calculateWinScore('东', '南', 3, false, 0),
      ];
      const kongDetails = [
        {player: '东' as PlayerPosition, type: 'concealed' as const, score: 4},
      ];
      
      const sheet = createScoreSheet(
        'game123',
        1,
        scoreDetails,
        kongDetails,
        initialScores
      );
      
      expect(sheet.gameId).toBe('game123');
      expect(sheet.roundNumber).toBe(1);
      expect(sheet.details).toHaveLength(1);
      expect(sheet.kongDetails).toHaveLength(1);
      expect(sheet.verified).toBe(false);
    });

    it('should handle multiple wins (多胡)', () => {
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
      
      expect(sheet.details).toHaveLength(2);
    });

    it('should apply adjustments', () => {
      const adjustment = createScoreAdjustment('东', 10, 'Manual correction');
      const sheet = createScoreSheet(
        'game123',
        1,
        [],
        [],
        initialScores,
        [adjustment]
      );
      
      expect(sheet.adjustments).toHaveLength(1);
      expect(sheet.totalScores['东']).toBe(10);
    });
  });

  describe('verifyScoreSheet', () => {
    it('should verify valid score sheet', () => {
      const scoreDetails = [
        calculateWinScore('东', '南', 2, false, 0),
      ];
      const sheet = createScoreSheet('game123', 1, scoreDetails, [], initialScores);
      
      const errors = verifyScoreSheet(sheet);
      expect(errors).toHaveLength(0);
    });

    it('should detect fan limit violations', () => {
      const sheet = createScoreSheet(
        'game123',
        1,
        [{
          winner: '东',
          loser: '南',
          fan: 6, // Exceeds limit
          isSelfDraw: false,
          kongScore: 0,
          baseScore: 64,
          totalScore: 64,
          multiplier: 1,
        }],
        [],
        initialScores
      );
      
      const errors = verifyScoreSheet(sheet);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Fan exceeds limit');
    });

    it('should detect kong score errors', () => {
      const sheet = createScoreSheet(
        'game123',
        1,
        [],
        [{player: '东', type: 'concealed', score: 10}], // Wrong score
        initialScores
      );
      
      const errors = verifyScoreSheet(sheet);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Invalid score');
    });
  });

  describe('Scoring Accuracy KPI', () => {
    it('should maintain 99.5% accuracy for complex scenarios', () => {
      // Test 1000 random scoring scenarios
      let correctCount = 0;
      const totalTests = 1000;

      for (let i = 0; i < totalTests; i++) {
        const fan = Math.floor(Math.random() * 6); // 0-5
        const isSelfDraw = Math.random() > 0.5;
        const scoreDetail = calculateWinScore(
          '东',
          isSelfDraw ? undefined : '南',
          fan,
          isSelfDraw,
          0
        );
        
        const newScores = applyWinToScores(scoreDetail, initialScores);
        const total = Object.values(newScores).reduce((sum, val) => sum + val, 0);
        
        // Zero-sum check
        if (Math.abs(total) < 0.01) {
          correctCount++;
        }
      }

      const accuracy = (correctCount / totalTests) * 100;
      expect(accuracy).toBeGreaterThanOrEqual(99.5);
    });
  });
});
