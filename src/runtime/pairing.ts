import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMigratedItem } from './legacySecureStore';
import type { PairingCredentials, RuntimeTarget } from './types';

const ROOM_KEY = 'jnbot.remote.room';
const DEVICE_KEY = 'jnbot.remote.device';
const TOKEN_KEY = 'jnbot.remote.token';
const PROFILE_KEY = 'jnbot.remote.profile';
const LOCAL_PROFILE_KEY = 'jnbot.local.profile';
const TARGET_KEY = 'jnbot.runtime.target';

export function parsePairingUrl(value: string): PairingCredentials {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('Paste a valid JNbot pairing link.');
  }
  if (url.protocol !== 'jnbot:' && !/^https?:$/.test(url.protocol))
    throw new Error('This is not a JNbot pairing link.');
  const room = url.searchParams.get('room')?.trim();
  const deviceId = url.searchParams.get('id')?.trim();
  const token = url.searchParams.get('token')?.trim();
  if (!room || !deviceId || !token)
    throw new Error('The pairing link is incomplete. Create a new access link in JNbot desktop.');
  return { room, deviceId, token };
}

export async function savePairing(credentials: PairingCredentials) {
  await Promise.all([
    AsyncStorage.setItem(ROOM_KEY, credentials.room),
    AsyncStorage.setItem(DEVICE_KEY, credentials.deviceId),
    AsyncStorage.setItem(TOKEN_KEY, credentials.token),
  ]);
  return credentials;
}

export async function loadPairing(): Promise<PairingCredentials | null> {
  const [room, deviceId, token] = await Promise.all([
    AsyncStorage.getItem(ROOM_KEY),
    AsyncStorage.getItem(DEVICE_KEY),
    getMigratedItem(TOKEN_KEY),
  ]);
  return room && deviceId && token ? { room, deviceId, token } : null;
}

export async function clearPairing() {
  await Promise.all([
    AsyncStorage.removeItem(ROOM_KEY),
    AsyncStorage.removeItem(DEVICE_KEY),
    AsyncStorage.removeItem(TOKEN_KEY),
    AsyncStorage.removeItem(PROFILE_KEY),
  ]);
}

export async function saveRuntimeTarget(target: RuntimeTarget) {
  if (target.kind === 'remote') await savePairing(target.credentials);
  await AsyncStorage.setItem(TARGET_KEY, target.kind);
}

export async function loadRuntimeTarget(): Promise<RuntimeTarget | null> {
  const kind = await AsyncStorage.getItem(TARGET_KEY);
  if (kind === 'local') return { kind: 'local' };
  if (kind === 'remote') {
    const credentials = await loadPairing();
    return credentials ? { kind: 'remote', credentials } : null;
  }
  // Existing installations only have remote credentials; migrate lazily.
  const credentials = await loadPairing();
  return credentials ? { kind: 'remote', credentials } : null;
}

export const clearRuntimeTarget = () => AsyncStorage.removeItem(TARGET_KEY);

export const loadSelectedProfile = () => AsyncStorage.getItem(PROFILE_KEY);
export const saveSelectedProfile = (profile: string) => AsyncStorage.setItem(PROFILE_KEY, profile);

export const loadLocalSelectedProfile = async () =>
  (await AsyncStorage.getItem(LOCAL_PROFILE_KEY)) ??
  AsyncStorage.getItem(PROFILE_KEY);

export const saveLocalSelectedProfile = (profileKey: string) =>
  AsyncStorage.setItem(LOCAL_PROFILE_KEY, profileKey);

