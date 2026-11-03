import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Reads a value from AsyncStorage, moving it out of SecureStore once for
 * installs from before 3.3.2. Remove together with expo-secure-store once
 * those installs have updated.
 */
export async function getMigratedItem(key: string) {
  const value = await AsyncStorage.getItem(key);
  if (value !== null) return value;
  try {
    const legacy = await SecureStore.getItemAsync(key);
    if (legacy === null) return null;
    await AsyncStorage.setItem(key, legacy);
    await SecureStore.deleteItemAsync(key);
    return legacy;
  } catch {
    return null;
  }
}
