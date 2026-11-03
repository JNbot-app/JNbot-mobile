jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));
jest.mock('../components/AppFeedback', () => ({
  useFeedback: () => ({
    showMessage: jest.fn(),
    openNotifications: jest.fn(),
  }),
}));

const mockProfileAction = jest.fn().mockResolvedValue(true);
const mockUpdateSettings = jest.fn().mockResolvedValue(true);

const mockClient = {
  profileAction: mockProfileAction,
  updateSettings: mockUpdateSettings,
} as any;

const mockShowMessage = jest.fn();

import { togglePluginPin, usePluginPin } from './usePluginPin';
import { actions, get } from '../store/store';

describe('plugin pinning', () => {
  beforeEach(() => {
    actions.reset();
    jest.clearAllMocks();
  });

  it('exports hook and toggle functions', () => {
    expect(typeof usePluginPin).toBe('function');
    expect(typeof togglePluginPin).toBe('function');
  });

  it('toggles pin state to true, updates store, and notifies user', async () => {
    const nextState = await togglePluginPin(mockClient, 'test-plugin', mockShowMessage);

    expect(nextState).toBe(true);
    expect(get().settings.pluginData?.['test-plugin']?.pinned).toBe(true);
    expect(mockProfileAction).toHaveBeenCalledWith(
      'UPDATE_PLUGIN_DATA',
      expect.objectContaining({ 'test-plugin': { pinned: true } }),
    );
    expect(mockShowMessage).toHaveBeenCalledWith('Pinned to dashboard', 'success');
  });

  it('toggles pin state back to false when called again', async () => {
    actions.applySettingsPatches({
      path: ['pluginData', 'test-plugin'],
      value: { pinned: true },
    });

    const nextState = await togglePluginPin(mockClient, 'test-plugin', mockShowMessage);

    expect(nextState).toBe(false);
    expect(get().settings.pluginData?.['test-plugin']?.pinned).toBe(false);
    expect(mockShowMessage).toHaveBeenCalledWith('Unpinned from dashboard', 'success');
  });
});
