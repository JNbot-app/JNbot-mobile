import React from 'react';
import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { MicrosoftDeviceCodePayload } from '../generated/client-contract/mobileClientContract';

const { act, create } = require('jest-expo/node_modules/react-test-renderer');
jest.setTimeout(30000);
let mockBots: Array<{ username: string; status: string }> = [];
let mockLogin: (MicrosoftDeviceCodePayload & { receivedAt: number }) | null;
const mockToast = jest.fn();
const mockClose = jest.fn();
jest.mock('../store/store', () => ({
  useStore: (selector: (state: { microsoftLogin: typeof mockLogin; activeBots: typeof mockBots }) => unknown) => selector({ microsoftLogin: mockLogin, activeBots: mockBots }),
  actions: { enqueueToast: (...args: unknown[]) => mockToast(...args), clearMicrosoftLogin: () => mockClose() },
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn().mockResolvedValue(true) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('./ui', () => {
  const { View, Text, Pressable } = require('react-native');
  return {
    Card: View, Txt: Text,
    Button: ({ title, onPress, disabled }: { title: string; onPress: () => void; disabled: boolean }) => <Pressable accessibilityLabel={title} onPress={onPress} disabled={disabled}><Text>{title}</Text></Pressable>,
  };
});
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: ({ children }: { children: React.ReactNode }) => <View>{children}</View> };
});
import { MicrosoftLoginModal } from './MicrosoftLoginModal';

const login = { userCode: 'ABC123', verificationUri: 'https://www.microsoft.com/link', receivedAt: 1000 };
const button = (view: ReturnType<typeof create>, name: string) => view.root.findByProps({ title: name });

beforeEach(() => {
  jest.clearAllMocks();
  mockLogin = { ...login };
  mockBots = [];
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

test('copies the code, provider URL, and combined message and opens that URL', async () => {
  let view: ReturnType<typeof create>;
  await act(async () => { view = create(<MicrosoftLoginModal />); });
  for (const name of ['Copy code', 'Copy verification URL', 'Copy URL and code', 'Open Microsoft']) {
    await act(async () => { await button(view, name).props.onPress(); });
  }
  expect(jest.mocked(Clipboard.setStringAsync).mock.calls.map(([value]) => value)).toEqual([login.userCode, login.verificationUri, `${login.verificationUri}\nCode: ${login.userCode}`]);
  expect(Linking.openURL).toHaveBeenCalledWith(login.verificationUri);
  await act(async () => view.unmount());
});

test('reports copy and open failures', async () => {
  jest.mocked(Clipboard.setStringAsync).mockRejectedValueOnce(new Error('denied'));
  jest.mocked(Linking.openURL).mockRejectedValueOnce(new Error('blocked'));
  let view: ReturnType<typeof create>;
  await act(async () => { view = create(<MicrosoftLoginModal />); });
  await act(async () => { await button(view, 'Copy code').props.onPress(); });
  await act(async () => { await button(view, 'Open Microsoft').props.onPress(); });
  expect(mockToast).toHaveBeenCalledTimes(2);
  expect(mockToast.mock.calls.every(([toast]) => toast.type === 'error')).toBe(true);
  await act(async () => view.unmount());
});

test('expires, resets for a new code, and cleans up on dismissal', async () => {
  jest.useFakeTimers().setSystemTime(1000);
  mockLogin = { ...login, expiresIn: 2 };
  let view: ReturnType<typeof create>;
  await act(async () => { view = create(<MicrosoftLoginModal />); });
  await act(async () => jest.advanceTimersByTime(2000));
  expect(button(view, 'Open Microsoft').props.disabled).toBe(true);
  expect(button(view, 'Copy URL and code').props.disabled).toBe(true);
  mockLogin = { ...login, userCode: 'NEW123', receivedAt: Date.now(), expiresIn: 10 };
  await act(async () => view.update(<MicrosoftLoginModal />));
  expect(button(view, 'Open Microsoft').props.disabled).toBe(false);
  const clear = jest.spyOn(globalThis, 'clearInterval');
  mockLogin = null;
  await act(async () => view.update(<MicrosoftLoginModal />));
  expect(clear).toHaveBeenCalled();
  await act(async () => view.unmount());
});


test('closes only when the prompted account joins, not for queued, failed, or unrelated accounts', async () => {
  mockLogin = { ...login, username: 'Alpha' };
  mockBots = [{ username: 'Alpha', status: 'queued' }, { username: 'Beta', status: 'connected' }];
  let view: ReturnType<typeof create>;
  await act(async () => { view = create(<MicrosoftLoginModal />); });
  expect(mockClose).not.toHaveBeenCalled();
  mockBots = [{ username: 'Alpha', status: 'failed' }];
  await act(async () => view.update(<MicrosoftLoginModal />));
  expect(mockClose).not.toHaveBeenCalled();
  mockBots = [{ username: 'alpha', status: 'connected' }];
  await act(async () => view.update(<MicrosoftLoginModal />));
  expect(mockClose).toHaveBeenCalledTimes(1);
  await act(async () => view.unmount());
});
