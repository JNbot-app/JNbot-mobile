jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../../runtime/pairing', () => ({ saveSelectedProfile: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: () => null,
}));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn().mockResolvedValue(undefined) }));

import React from 'react';
import {
  BOT_DETAIL_TABS,
  BotDetailHeader,
  BotDetailTabBar,
  DEFAULT_BOT_DETAIL_TAB,
} from './BotDetailChrome';

describe('BotDetailChrome', () => {
  it('uses concise, unique labels for every bot destination in expected order', () => {
    expect(BOT_DETAIL_TABS.map((item) => item.label)).toEqual([
      'Info',
      'Chat',
      'Inventory',
      'Actions',
      'Move',
      'Map',
      'Triggers',
    ]);
    expect(BOT_DETAIL_TABS.map((item) => item.id)).toEqual([
      'info',
      'chat',
      'inventory',
      'actions',
      'movement',
      'map',
      'triggers',
    ]);
    expect(DEFAULT_BOT_DETAIL_TAB).toBe('chat');
    expect(new Set(BOT_DETAIL_TABS.map((item) => item.id)).size).toBe(
      BOT_DETAIL_TABS.length,
    );
  });

  it('exposes the active destination as an accessible tab', () => {
    const element = BotDetailTabBar({
      activeTab: 'inventory',
      connected: true,
      onChange: jest.fn(),
    });
    const serialized = JSON.stringify(element);

    expect(serialized).toContain('"accessibilityRole":"tablist"');
    expect(serialized).toContain('"selected":true');
    expect(serialized).toContain('Inventory');
    expect(serialized).not.toContain('Movement');
  });

  it('keeps the destructive leave action visible in the compact header', () => {
    const element = BotDetailHeader({
      bot: {
        botId: 7,
        username: 'Zola',
        script: 'chat',
        id: 'zola',
        version: '1.21.11',
        uuid: undefined,
        host: 'localhost',
        port: 25565,
        status: 'connected',
        paused: false,
        SCRIPT_NAME: 'chat',
        SCRIPT_ID: 'chat',
        INSTANCE_ID: '1',
      },
      canControl: true,
      canLeave: true,
      onBack: jest.fn(),
      onLeave: jest.fn(),
    });
    const serialized = JSON.stringify(element);

    expect(serialized).toContain('Zola');
    expect(serialized).toContain('Leave server');
  });

  it('shows the script name under the username and icon-only script controls', () => {
    const element = BotDetailHeader({
      bot: { botId: 7, username: 'Zola', status: 'connected' } as never,
      scriptName: 'chat',
      canControl: true,
      canLeave: true,
      toggleLabel: 'Pause',
      onBack: jest.fn(),
      onToggle: jest.fn(),
      onStop: jest.fn(),
      onLeave: jest.fn(),
    });
    const serialized = JSON.stringify(element);

    expect(serialized).toContain('"children":"chat"');
    expect(serialized).toContain('Stop script');
    expect(serialized).toContain('Pause');
    expect(serialized).not.toContain('"children":"Stop"');
  });
});
