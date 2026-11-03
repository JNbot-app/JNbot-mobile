jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(), setItem: jest.fn(),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { getMigratedItem } from './legacySecureStore';

beforeEach(() => jest.resetAllMocks());

it('prefers AsyncStorage without touching SecureStore', async () => {
  jest.mocked(AsyncStorage.getItem).mockResolvedValue('new');
  await expect(getMigratedItem('key')).resolves.toBe('new');
  expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
});

it('moves a legacy SecureStore value once', async () => {
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue('old');
  await expect(getMigratedItem('key')).resolves.toBe('old');
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('key', 'old');
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('key');
});

it('treats a failing SecureStore as empty', async () => {
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
  jest.mocked(SecureStore.getItemAsync).mockRejectedValue(new Error('NullPointerException'));
  await expect(getMigratedItem('key')).resolves.toBeNull();
});
