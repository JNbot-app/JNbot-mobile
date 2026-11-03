jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: {
    Success: 'success',
    Error: 'error',
    Warning: 'warning',
  },
  ImpactFeedbackStyle: {
    Light: 'light',
  },
}));

import React from 'react';
import { ToastViewport, getToastSeverityMeta } from './ToastViewport';
import { actions, useStore } from '../store/store';
import { colors } from '../theme/theme';

describe('ToastViewport', () => {
  beforeEach(() => {
    useStore.setState({ toasts: [] });
    jest.clearAllMocks();
  });

  describe('getToastSeverityMeta', () => {
    it('returns success icon and color for success type', () => {
      const meta = getToastSeverityMeta('success');
      expect(meta.icon).toBe('checkmark-circle');
      expect(meta.color).toBe(colors.success);
    });

    it('returns danger icon and color for error type', () => {
      const meta = getToastSeverityMeta('error');
      expect(meta.icon).toBe('alert-circle');
      expect(meta.color).toBe(colors.danger);
    });

    it('returns warning icon and color for warning type', () => {
      const meta = getToastSeverityMeta('warning');
      expect(meta.icon).toBe('warning');
      expect(meta.color).toBe(colors.warning);
    });

    it('returns info icon and color for default/info type', () => {
      const meta = getToastSeverityMeta('info');
      expect(meta.icon).toBe('information-circle');
      expect(meta.color).toBe(colors.info);
    });
  });

  describe('Toast store integration', () => {
    it('enqueues and dismisses toast properly in store', () => {
      expect(useStore.getState().toasts).toHaveLength(0);

      actions.enqueueToast({
        id: 'test-toast-1',
        title: 'Cooldown restarted',
        type: 'success',
      });

      const toastsAfterEnqueue = useStore.getState().toasts;
      expect(toastsAfterEnqueue).toHaveLength(1);
      expect(toastsAfterEnqueue[0].title).toBe('Cooldown restarted');
      expect(toastsAfterEnqueue[0].type).toBe('success');

      actions.dismissToast('test-toast-1');
      expect(useStore.getState().toasts).toHaveLength(0);
    });
  });

  describe('Component export', () => {
    it('exports a valid React function component', () => {
      expect(typeof ToastViewport).toBe('function');
    });

  });
});
