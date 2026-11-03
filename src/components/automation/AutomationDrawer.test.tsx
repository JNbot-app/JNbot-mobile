jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
  MaterialIcons: () => null,
}));
jest.mock('../NativeIcon', () => ({ NativeIcon: () => null }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../net/ConnectionProvider', () => ({
  useClient: () => null,
  useConnection: () => ({
    previewPortablePlugins: jest.fn().mockResolvedValue([]),
    importPortablePlugins: jest.fn().mockResolvedValue({ installed: [], skipped: [], failed: [] }),
  }),
}));
jest.mock('../../hooks/useCommands', () => ({
  useCommands: () => ({
    stopScript: jest.fn(),
    sendControl: jest.fn(),
  }),
}));
jest.mock('../../monetization/MonetizationProvider', () => ({
  useMonetization: () => ({
    executeWithMonetization: jest.fn((fn) => fn()),
  }),
}));

import { AutomationDrawerProvider, useAutomationDrawer } from './AutomationDrawer';

describe('AutomationDrawerProvider', () => {
  it('exports valid component and hook functions without module evaluation errors', () => {
    expect(typeof AutomationDrawerProvider).toBe('function');
    expect(typeof useAutomationDrawer).toBe('function');
  });
});
