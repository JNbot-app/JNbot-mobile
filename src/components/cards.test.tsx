jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../runtime/pairing', () => ({ saveSelectedProfile: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

import React from 'react';
import { botStatusMeta, BotStatusBadge, BotStatusBadgeView } from './cards';
import { colors } from '../theme/theme';

describe('cards bot status', () => {
  describe('botStatusMeta', () => {
    it('returns paused meta when bot is paused', () => {
      const meta = botStatusMeta({ status: 'connected', paused: true });
      expect(meta).toEqual({ color: colors.paused, label: 'Paused' });
    });

    it('returns online meta for connected status', () => {
      const meta = botStatusMeta({ status: 'connected' });
      expect(meta).toEqual({ color: colors.online, label: 'Online' });
    });

    it('returns warning meta for joining status', () => {
      const meta = botStatusMeta({ status: 'joining' });
      expect(meta).toEqual({ color: colors.warning, label: 'Joining' });
    });

    it('returns danger meta for failed status', () => {
      const meta = botStatusMeta({ status: 'failed' });
      expect(meta).toEqual({ color: colors.danger, label: 'Failed' });
    });

    it('returns info meta with Queued label when no joinAt is provided', () => {
      expect(botStatusMeta({ status: 'queued' })).toEqual({
        color: colors.info,
        label: 'Queued',
      });
      expect(botStatusMeta({ status: 'queue' })).toEqual({
        color: colors.info,
        label: 'Queued',
      });
    });

    it('returns info meta with countdown when joinAt and now are provided', () => {
      const now = 1_000_000;
      const joinAt = now + 12_000; // 12 seconds in future
      const meta = botStatusMeta({ status: 'queued', joinAt }, now);
      expect(meta).toEqual({
        color: colors.info,
        label: 'Queued · in 12s',
      });
    });

    it('formats countdown with minutes when joinAt is more than 60s away', () => {
      const now = 1_000_000;
      const joinAt = now + 65_000;
      const meta = botStatusMeta({ status: 'queue', joinAt }, now);
      expect(meta).toEqual({
        color: colors.info,
        label: 'Queued · in 1m 05s',
      });
    });
  });

  describe('BotStatusBadgeView', () => {
    it('renders connected status correctly', () => {
      const element = BotStatusBadgeView({ bot: { status: 'connected' } });
      const str = JSON.stringify(element);
      expect(str).toContain('Online');
      expect(str).toContain(colors.online);
    });

    it('renders queued status with countdown when joinAt is provided', () => {
      const now = 1_000_000;
      const joinAt = now + 5_000;
      const element = BotStatusBadgeView({ bot: { status: 'queued', joinAt }, now });
      const str = JSON.stringify(element);
      expect(str).toContain('Queued · in 5s');
      expect(str).toContain(colors.info);
    });

    it('renders queued status without countdown when joinAt is absent', () => {
      const element = BotStatusBadgeView({ bot: { status: 'queued' } });
      const str = JSON.stringify(element);
      expect(str).toContain('Queued');
      expect(str).toContain(colors.info);
    });
  });

  describe('BotStatusBadge export', () => {
    it('exports a valid function component', () => {
      expect(typeof BotStatusBadge).toBe('function');
    });
  });
});
