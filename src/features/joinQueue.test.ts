import { formatJoinCountdown, isBotQueued } from './joinQueue';

describe('joinQueue', () => {
  describe('formatJoinCountdown', () => {
    it('returns 0s when joinAt is undefined', () => {
      expect(formatJoinCountdown(undefined, 1000)).toBe('0s');
    });

    it('returns 0s when joinAt is equal to or in the past relative to now', () => {
      expect(formatJoinCountdown(1000, 1000)).toBe('0s');
      expect(formatJoinCountdown(500, 1000)).toBe('0s');
    });

    it('formats seconds correctly when less than a minute', () => {
      expect(formatJoinCountdown(1000 + 5000, 1000)).toBe('5s');
      expect(formatJoinCountdown(1000 + 59000, 1000)).toBe('59s');
    });

    it('rounds up partial seconds', () => {
      expect(formatJoinCountdown(1000 + 4200, 1000)).toBe('5s');
      expect(formatJoinCountdown(1000 + 100, 1000)).toBe('1s');
    });

    it('formats minutes and padded seconds when 60s or more', () => {
      expect(formatJoinCountdown(1000 + 60000, 1000)).toBe('1m 00s');
      expect(formatJoinCountdown(1000 + 65000, 1000)).toBe('1m 05s');
      expect(formatJoinCountdown(1000 + 125000, 1000)).toBe('2m 05s');
    });
  });

  describe('isBotQueued', () => {
    it('returns true for queued and queue', () => {
      expect(isBotQueued('queued')).toBe(true);
      expect(isBotQueued('queue')).toBe(true);
    });

    it('returns false for other statuses', () => {
      expect(isBotQueued('connected')).toBe(false);
      expect(isBotQueued('joining')).toBe(false);
      expect(isBotQueued('failed')).toBe(false);
      expect(isBotQueued(undefined)).toBe(false);
    });
  });
});
