import {
  timeToMinutes,
  minutesToTime,
  generateSlots,
  intervalsOverlap,
} from './time-slot.utils';

describe('time-slot.utils', () => {
  describe('timeToMinutes', () => {
    it('pretvara "09:00" u 540', () => {
      expect(timeToMinutes('09:00')).toBe(540);
    });
    it('pretvara "00:00" u 0', () => {
      expect(timeToMinutes('00:00')).toBe(0);
    });
    it('pretvara "23:59" u 1439', () => {
      expect(timeToMinutes('23:59')).toBe(1439);
    });
    it('pretvara "12:30" u 750', () => {
      expect(timeToMinutes('12:30')).toBe(750);
    });
  });

  describe('minutesToTime', () => {
    it('pretvara 540 u "09:00"', () => {
      expect(minutesToTime(540)).toBe('09:00');
    });
    it('pretvara 0 u "00:00"', () => {
      expect(minutesToTime(0)).toBe('00:00');
    });
    it('pretvara 750 u "12:30"', () => {
      expect(minutesToTime(750)).toBe('12:30');
    });
  });

  describe('generateSlots', () => {
    it('generiše slotove za 60min servis, 10min pauza', () => {
      const slots = generateSlots('09:00', '12:00', 60, 10);
      expect(slots).toHaveLength(2);
      expect(slots[0]).toEqual({ startTime: '09:00', endTime: '10:00' });
      expect(slots[1]).toEqual({ startTime: '10:10', endTime: '11:10' });
    });
    it('vraća prazan niz kada radno vrijeme kraće od trajanja', () => {
      const slots = generateSlots('09:00', '09:30', 60, 10);
      expect(slots).toHaveLength(0);
    });
    it('jedan slot kada upravo stane', () => {
      const slots = generateSlots('09:00', '10:00', 60, 10);
      expect(slots).toHaveLength(1);
      expect(slots[0]).toEqual({ startTime: '09:00', endTime: '10:00' });
    });
  });

  describe('intervalsOverlap', () => {
    it('preklapanje: 09:00-10:00 i 09:30-10:30', () => {
      expect(intervalsOverlap(540, 600, 570, 630)).toBe(true);
    });
    it('nema preklapanja: 09:00-10:00 i 10:00-11:00', () => {
      expect(intervalsOverlap(540, 600, 600, 660)).toBe(false);
    });
    it('nema preklapanja: 10:00-11:00 i 09:00-10:00', () => {
      expect(intervalsOverlap(600, 660, 540, 600)).toBe(false);
    });
    it('preklapanje: isti interval', () => {
      expect(intervalsOverlap(540, 600, 540, 600)).toBe(true);
    });
  });
});
