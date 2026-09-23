import { calculateTarget, calculateNextPing } from './calculations';

describe('Calculations', () => {
  describe('calculateTarget', () => {
    it('calculates correct target for a young active male', () => {
      const target = calculateTarget(72, 28, 1.5, 'Male');
      // Base: 72 * 35 = 2520
      // Age < 30: 2520 * 1.05 = 2646
      // Energy: 2646 * 1.5 = 3969
      // Male: 3969 * 1.05 = 4167.45
      // Rounded to 50: 4150
      expect(target).toBe(4150);
    });

    it('calculates correct target for older sedentary female', () => {
      const target = calculateTarget(60, 60, 1.1, 'Female');
      // Base: 60 * 35 = 2100
      // Age > 55: 2100 * 0.95 = 1995
      // Energy: 1995 * 1.1 = 2194.5
      // Female: no male multiplier
      // Rounded to 50: 2200
      expect(target).toBe(2200);
    });
    
    it('respects min target limit', () => {
      const target = calculateTarget(30, 20, 1.0, 'Female');
      // Should be very low but clamped to 1500
      expect(target).toBe(1500);
    });
    
    it('respects max target limit', () => {
      const target = calculateTarget(150, 20, 2.0, 'Male');
      // Should be very high but clamped to 5000
      expect(target).toBe(5000);
    });
  });
  
  describe('calculateNextPing', () => {
    it('returns null if target is reached', () => {
      const ping = calculateNextPing('07:00', '23:00', 2000, 2000);
      expect(ping).toBeNull();
    });
    
    it('returns a formatted string when target not reached', () => {
      const ping = calculateNextPing('07:00', '23:00', 2000, 1000);
      expect(ping).toMatch(/^Today, \d{2}:\d{2} [AP]M$/);
    });
  });
});
