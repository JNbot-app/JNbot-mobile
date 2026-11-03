import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenSafeArea } from '../src/components/ScreenSafeArea';
import { Button, Txt } from '../src/components/ui';
import { useConnection } from '../src/net/ConnectionProvider';
import { useStore } from '../src/store/store';
import { colors, radii, spacing } from '../src/theme/theme';
import { setScannedInstanceImportUrl } from '../src/runtime/instanceTransfer';

export default function Scan() {
  const router = useRouter();
  const { returnTo, purpose } = useLocalSearchParams<{ returnTo?: string; purpose?: string }>();
  const { connectFromUrl } = useConnection();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission?.granted) {
    return (
      <ScreenSafeArea style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={44} color={colors.primary} />
          <Txt variant="heading">Camera access is needed</Txt>
          <Txt variant="muted" style={{ textAlign: 'center' }}>
            Allow camera access to scan a pairing QR code.
          </Txt>
          <Button title="Allow camera" onPress={() => requestPermission()} />
        </View>
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
        <Txt variant="heading">Scan pairing QR</Txt>
      </View>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={
          scanned
            ? undefined
            : ({ data }) => {
                setScanned(true);
                if (purpose === 'instance-import') {
                  setScannedInstanceImportUrl(data);
                  router.back();
                  return;
                }
                void connectFromUrl(data)
                  .then(() => {
                    const activeProfileKey = useStore.getState().activeProfileKey;
                    const target = returnTo
                      ? (returnTo as any)
                      : activeProfileKey
                      ? '/(app)/dashboard'
                      : '/(app)/profiles';
                    if (router.canGoBack()) {
                      router.dismissAll();
                    }
                    router.replace(target);
                  })
                  .catch(() => setScanned(false));
              }
        }
      />
      <View style={styles.caption}>
        <Txt variant="muted" style={{ textAlign: 'center' }}>
          Scan the JNbot Mobile QR code from the desktop Remote access screen.
        </Txt>
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  camera: { flex: 1, margin: spacing.lg, borderRadius: radii.lg, overflow: 'hidden' },
  caption: { padding: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
});
