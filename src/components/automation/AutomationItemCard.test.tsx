jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
  MaterialIcons: () => null,
}));
jest.mock('../NativeIcon', () => ({ NativeIcon: () => null }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../store/store', () => ({
  useStore: jest.fn((selector) => selector({ settings: { pluginData: {} } })),
}));

import React from 'react';
import {
  AutomationItemCard,
  AutomationItemCardComponent,
  getAutomationItemIconConfig,
} from './AutomationItemCard';
import type { MacroInfo } from '../../store/types';
import type { ProfileScriptInfo } from '../../hooks/useProfileScriptInfos';

describe('AutomationItemCard', () => {
  const samplePlugin: MacroInfo = {
    pluginId: 'mine-iron',
    name: 'Mine Iron',
    description: 'Mines iron ore automatically',
    createdAt: 1700000000000,
    editedAt: null,
    public: true,
    scriptType: 'script',
    language: 'ts',
  };

  const samplePluginWithBanner: MacroInfo = {
    ...samplePlugin,
    banner: 'https://example.com/mine-iron-banner.jpg',
  };

  const sampleAction: MacroInfo = {
    pluginId: 'quick-eat',
    name: 'Quick Eat',
    description: 'Eats food quickly',
    createdAt: 1700000000000,
    editedAt: null,
    public: false,
    scriptType: 'action',
  };

  const sampleRecording: MacroInfo = {
    pluginId: 'record-walk',
    name: 'Record Walk',
    description: 'Recorded walk path',
    createdAt: 1700000000000,
    editedAt: null,
    public: false,
    scriptType: 'script',
    language: 'recording',
  };

  const sampleProfileScript: ProfileScriptInfo = {
    id: 'ps-1',
    pluginId: 'custom-runner',
    name: 'Daily Farm',
    description: 'Harvests wheat crops',
  };

  describe('getAutomationItemIconConfig', () => {
    it('returns code icon for TypeScript plugins', () => {
      const config = getAutomationItemIconConfig(samplePlugin, true);
      expect(config.sf).toBe('chevron.left.forwardslash.chevron.right');
      expect(config.material).toBe('code');
      expect(config.sf).not.toContain('play');
    });

    it('returns bolt icon for action plugins', () => {
      const config = getAutomationItemIconConfig(sampleAction, true);
      expect(config.sf).toBe('bolt.fill');
      expect(config.material).toBe('bolt');
      expect(config.sf).not.toContain('play');
    });

    it('returns video icon for recording macros', () => {
      const config = getAutomationItemIconConfig(sampleRecording, true);
      expect(config.sf).toBe('video.fill');
      expect(config.material).toBe('videocam');
      expect(config.sf).not.toContain('play');
    });

    it('returns document icon for profile scripts without matched plugin', () => {
      const config = getAutomationItemIconConfig(sampleProfileScript, false);
      expect(config.sf).toBe('doc.text.fill');
      expect(config.material).toBe('description');
      expect(config.sf).not.toContain('play');
    });

    it('inherits matched plugin icon for profile scripts backed by an installed plugin', () => {
      const config = getAutomationItemIconConfig(
        sampleProfileScript,
        false,
        sampleAction,
      );
      expect(config.sf).toBe('bolt.fill');
      expect(config.material).toBe('bolt');
      expect(config.sf).not.toContain('play');
    });

    it('inherits icon from item.info when matchedPlugin is not provided', () => {
      const config = getAutomationItemIconConfig(
        {
          ...sampleProfileScript,
          info: sampleAction,
        },
        false,
      );
      expect(config.sf).toBe('bolt.fill');
      expect(config.material).toBe('bolt');
      expect(config.sf).not.toContain('play');
    });
  });

  describe('component structure', () => {
    it('exports a memoized component', () => {
      expect(AutomationItemCard).toBeDefined();
      expect((AutomationItemCard as any).$$typeof).toBe(Symbol.for('react.memo'));
    });

    it('sets accessibilityLabel to configure the script and does not contain play or bottom text', () => {
      const onPress = jest.fn();
      const element = AutomationItemCardComponent({
        item: samplePlugin,
        isPlugin: true,
        onPress,
      });

      expect(React.isValidElement(element)).toBe(true);
      if (!React.isValidElement(element)) return;

      const props = element.props as Record<string, any>;
      expect(props.accessibilityRole).toBe('button');
      expect(props.accessibilityLabel).toBe('Configure Mine Iron');
      expect(props.accessibilityHint).toBe(
        'Opens script settings and controls',
      );

      // Verify onPress fires with item
      props.onPress();
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledWith(samplePlugin);

      // Verify rendered tree does not contain "Installed plugin" or "Profile script"
      const stringified = JSON.stringify(element);
      expect(stringified).not.toContain('Installed plugin');
      expect(stringified).not.toContain('Profile script');
    });

    it('includes running badge when running is true', () => {
      const element = AutomationItemCardComponent({
        item: samplePlugin,
        isPlugin: true,
        running: true,
        onPress: jest.fn(),
      });

      const stringified = JSON.stringify(element);
      expect(stringified).toContain('Running');
    });

    it('does not render redundant Action badge since icon and color distinguish it', () => {
      const element = AutomationItemCardComponent({
        item: sampleAction,
        isPlugin: true,
        onPress: jest.fn(),
      });

      const stringified = JSON.stringify(element);
      expect(stringified).not.toContain('"label":"Action"');
    });

    it('includes setup badge when hasOptionError is true', () => {
      const element = AutomationItemCardComponent({
        item: samplePlugin,
        isPlugin: true,
        hasOptionError: true,
        onPress: jest.fn(),
      });

      const stringified = JSON.stringify(element);
      expect(stringified).toContain('Needs setup');
    });

    it('uses a plugin banner as the list artwork when available', () => {
      const element = AutomationItemCardComponent({
        item: samplePluginWithBanner,
        isPlugin: true,
        onPress: jest.fn(),
      });

      expect(JSON.stringify(element)).toContain(samplePluginWithBanner.banner);
    });

    it('uses the matched plugin banner for a profile script', () => {
      const element = AutomationItemCardComponent({
        item: sampleProfileScript,
        isPlugin: false,
        matchedPlugin: samplePluginWithBanner,
        onPress: jest.fn(),
      });

      expect(JSON.stringify(element)).toContain(samplePluginWithBanner.banner);
    });

    it('uses profile script banner directly when matchedPlugin is not provided', () => {
      const element = AutomationItemCardComponent({
        item: {
          ...sampleProfileScript,
          banner: 'https://example.com/profile-script-banner.jpg',
        },
        isPlugin: false,
        onPress: jest.fn(),
      });

      expect(JSON.stringify(element)).toContain('https://example.com/profile-script-banner.jpg');
    });

    it('applies grouped styles based on isFirst and isLast', () => {
      const firstElement = AutomationItemCardComponent({
        item: samplePlugin,
        isPlugin: true,
        isFirst: true,
        isLast: false,
        onPress: jest.fn(),
      });

      const middleElement = AutomationItemCardComponent({
        item: samplePlugin,
        isPlugin: true,
        isFirst: false,
        isLast: false,
        onPress: jest.fn(),
      });

      const lastElement = AutomationItemCardComponent({
        item: samplePlugin,
        isPlugin: true,
        isFirst: false,
        isLast: true,
        onPress: jest.fn(),
      });

      expect(React.isValidElement(firstElement)).toBe(true);
      expect(React.isValidElement(middleElement)).toBe(true);
      expect(React.isValidElement(lastElement)).toBe(true);
    });
  });
});
