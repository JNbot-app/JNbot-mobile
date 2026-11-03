jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'NativeSafeAreaView',
  useSafeAreaInsets: jest.fn(),
}));

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenSafeArea } from './ScreenSafeArea';

const mockInsets = jest.mocked(useSafeAreaInsets);

beforeEach(() => {
  mockInsets.mockReturnValue({ top: 59, bottom: 34, left: 0, right: 0 });
});

it('positions a newly mounted screen below the notch on its first render', () => {
  const element = ScreenSafeArea({ edges: ['top', 'left', 'right'] });

  expect(element.type).toBe(View);
  expect(StyleSheet.flatten(element.props.style)).toMatchObject({
    paddingTop: 59,
    paddingBottom: 0,
  });
});

it('protects all edges by default and updates when device insets change', () => {
  const first = ScreenSafeArea({});
  expect(StyleSheet.flatten(first.props.style)).toMatchObject({
    paddingTop: 59, paddingBottom: 34, paddingLeft: 0, paddingRight: 0,
  });

  mockInsets.mockReturnValue({ top: 0, bottom: 21, left: 59, right: 59 });
  const rotated = ScreenSafeArea({});
  expect(StyleSheet.flatten(rotated.props.style)).toMatchObject({
    paddingTop: 0, paddingBottom: 21, paddingLeft: 59, paddingRight: 59,
  });
});

it('preserves screen styling, content and accessibility props', () => {
  const child = <View />;
  const element = ScreenSafeArea({
    style: [{ flex: 1 }, { backgroundColor: 'black' }],
    children: child,
    accessibilityLabel: 'Screen',
  });

  expect(StyleSheet.flatten(element.props.style)).toMatchObject({
    flex: 1, backgroundColor: 'black', paddingTop: 59,
  });
  expect(element.props.children).toBe(child);
  expect(element.props.accessibilityLabel).toBe('Screen');
});

it('adds safe insets to existing screen padding without adding a tab-bar inset', () => {
  const element = ScreenSafeArea({
    edges: ['top', 'left', 'right'],
    style: { padding: 8, paddingVertical: 12, paddingTop: 16 },
  });
  expect(StyleSheet.flatten(element.props.style)).toMatchObject({
    paddingTop: 75, paddingBottom: 12, paddingLeft: 8, paddingRight: 8,
  });
});
