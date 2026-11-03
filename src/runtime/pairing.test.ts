jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn(),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadSelectedProfile,
  parsePairingUrl,
  saveSelectedProfile,
} from './pairing';

describe('parsePairingUrl', () => {
  it('accepts the desktop mobile deep link', () => {
    expect(parsePairingUrl('jnbot://connect?room=my-room&id=device-1&token=top-secret')).toEqual({
      room: 'my-room', deviceId: 'device-1', token: 'top-secret',
    });
  });

  it('accepts the existing browser access URL', () => {
    expect(parsePairingUrl('https://jnbot-app.netlify.app/?room=a&id=b&token=c')).toEqual({
      room: 'a', deviceId: 'b', token: 'c',
    });
  });

  it('rejects incomplete links', () => {
    expect(() => parsePairingUrl('jnbot://connect?room=a&id=b')).toThrow('incomplete');
  });
});

describe('selected profile persistence', () => {
  it('persists selected remote profile key', async () => {
    await saveSelectedProfile('jartexnetwork');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'jnbot.remote.profile',
      'jartexnetwork',
    );
  });

  it('loads selected remote profile key', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('jartexnetwork');
    await expect(loadSelectedProfile()).resolves.toBe('jartexnetwork');
  });
});

