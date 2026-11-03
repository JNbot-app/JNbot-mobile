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
  impactAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockOpenProfileScript = jest.fn();
const mockOpenPlugin = jest.fn();
jest.mock('../automation/AutomationDrawer', () => ({
  useAutomationDrawer: () => ({
    openProfileScript: mockOpenProfileScript,
    openPlugin: mockOpenPlugin,
  }),
}));

const mockShowMessage = jest.fn();
jest.mock('../AppFeedback', () => ({
  useFeedback: () => ({
    showMessage: mockShowMessage,
    openNotifications: jest.fn(),
  }),
}));

const mockRunPlugin = jest.fn();
const mockStopScript = jest.fn();
jest.mock('../../hooks/useCommands', () => ({
  useCommands: () => ({
    runPlugin: mockRunPlugin,
    stopScript: mockStopScript,
  }),
}));

jest.mock('../../net/ConnectionProvider', () => ({
  useClient: () => ({
    profileAction: jest.fn().mockResolvedValue({}),
  }),
}));

let mockProfileScripts: any[] = [];
jest.mock('../../hooks/useProfileScriptInfos', () => ({
  useProfileScriptInfos: () => mockProfileScripts,
}));

let mockStoreState: Record<string, any> = {
  activeScripts: {},
  activeProfileKey: 'test-server',
  JNdata: { data: { 'test-server': { disallowedPlugins: [] } } },
  settings: { pluginData: {} },
  macros: { list: [] },
};

jest.mock('../../store/store', () => ({
  useStore: (selector: (state: any) => any) => selector(mockStoreState),
}));

import React from 'react';
import { DashboardScripts } from './DashboardScripts';
import { DashboardScriptCard } from './DashboardScriptCard';

describe('DashboardScripts & DashboardScriptCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfileScripts = [];
    mockStoreState = {
      activeScripts: {},
      activeProfileKey: 'test-server',
      JNdata: { data: { 'test-server': { disallowedPlugins: [] } } },
      settings: { pluginData: {} },
      macros: { list: [] },
    };
  });

  it('exports valid memoized components without module evaluation errors', () => {
    expect(DashboardScripts).toBeDefined();
    expect(DashboardScriptCard).toBeDefined();
    expect((DashboardScripts as any).$$typeof).toBe(Symbol.for('react.memo'));
    expect((DashboardScriptCard as any).$$typeof).toBe(Symbol.for('react.memo'));
  });

  it('has appropriate display names for debugging', () => {
    expect(DashboardScripts.displayName).toBe('DashboardScripts');
    expect(DashboardScriptCard.displayName).toBe('DashboardScriptCard');
  });

  it('keeps script card title white across theme switches', () => {
    const { applyTheme, Themes } = require('../../theme/theme');
    for (const theme of Object.values(Themes)) {
      applyTheme(theme as any);
    }
  });
});
