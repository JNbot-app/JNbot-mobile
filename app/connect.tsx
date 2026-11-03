import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenSafeArea } from '../src/components/ScreenSafeArea';
import { Button, Txt } from '../src/components/ui';
import { JNbotLogo } from '../src/components/JNbotLogo';
import { useConnection } from '../src/net/ConnectionProvider';
import { useStore } from '../src/store/store';
import { colors, radii, spacing } from '../src/theme/theme';
import { EmbeddedNodeBridge } from '../src/runtime/EmbeddedNodeBridge';

export default function Connect() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { useLocal, status, lastError, target } = useConnection();
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  const finish = () => {
    const activeKey = useStore.getState().activeProfileKey;
    router.replace(returnTo ? (returnTo as never) : (activeKey ? '/(app)/dashboard' : '/(app)/profiles'));
  };

  const startLocal = async () => {
    setBusy(true);
    try {
      await useLocal();
      finish();
    } catch {
      // ConnectionProvider exposes the user-facing error below.
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (returnTo || started.current) return;
    started.current = true;
    void startLocal();
  }, [returnTo]);

  const starting = busy || ['signaling', 'synchronizing'].includes(status);

  return (
    <ScreenSafeArea style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.welcome}>
          <JNbotLogo size={76} />
          <Txt variant="title" style={styles.title}>
            {returnTo ? 'Choose where JNbot runs' : 'Welcome to JNbot'}
          </Txt>
          <Txt variant="body" style={styles.intro}>
            {returnTo
              ? 'Run bots on this phone or control your desktop remotely.'
              : 'Getting JNbot ready on this phone…'}
          </Txt>
        </View>

        {lastError ? (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={21} color={colors.danger} />
            <View style={styles.errorCopy}>
              <Txt variant="heading" style={styles.errorTitle}>Couldn&apos;t start JNbot</Txt>
              <Txt variant="muted" style={styles.errorText}>{lastError}</Txt>
            </View>
          </View>
        ) : null}

        {returnTo || lastError ? (
          <View style={styles.actions}>
            <Button
              title={starting ? 'Starting on this phone…' : lastError ? 'Try this phone again' : 'Use this phone'}
              loading={starting}
              disabled={starting}
              full
              icon={<Ionicons name="phone-portrait-outline" size={19} color={colors.primaryOn} />}
              onPress={() => void startLocal()}
            />
            {lastError && target?.kind === 'local' ? <Button
              title="Switch to local storage"
              variant="secondary"
              disabled={starting}
              onPress={() => void new EmbeddedNodeBridge().requestStorage('select', { mode: 'local' }).then(startLocal).catch((error) => Alert.alert('Storage change failed', String(error)))}
            /> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pair with a desktop"
              disabled={busy}
              onPress={() => router.push({ pathname: '/scan', params: returnTo ? { returnTo } : undefined })}
              style={({ pressed }) => [
                styles.pairAction,
                pressed && styles.pairActionPressed,
                busy && styles.disabled,
              ]}
            >
              <View style={styles.pairIcon}>
                <Ionicons name="qr-code-outline" size={23} color={colors.primary} />
              </View>
              <View style={styles.pairCopy}>
                <Txt variant="heading">Pair with a desktop</Txt>
                <Txt variant="muted">Scan the QR code in JNbot Desktop.</Txt>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.preparing}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Txt variant="muted">Loading server profiles…</Txt>
          </View>
        )}

        <View style={styles.footer}>
          {starting ? <ActivityIndicator color={colors.primary} size="small" /> : (
            <Ionicons name="shield-checkmark-outline" size={17} color={colors.textFaint} />
          )}
          <Txt variant="faint" style={styles.footerText}>
            Your connection and credentials stay secured on this device.
          </Txt>
        </View>
      </ScrollView>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  welcome: {
    alignItems: 'center',
  },
  title: {
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  intro: {
    maxWidth: 340,
    marginTop: spacing.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    gap: spacing.md,
    marginTop: spacing.xxxl,
  },
  preparing: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxxl,
  },
  pairAction: {
    minHeight: process.env.EXPO_OS === 'android' ? 76 : 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  pairActionPressed: {
    backgroundColor: colors.surfaceHover,
  },
  pairIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderCurve: 'continuous',
    backgroundColor: colors.primarySoft,
  },
  pairCopy: {
    flex: 1,
    gap: 2,
  },
  disabled: {
    opacity: 0.45,
  },
  errorBanner: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.dangerSoft,
  },
  errorCopy: {
    flex: 1,
    gap: 2,
  },
  errorTitle: {
    color: colors.danger,
  },
  errorText: {
    color: colors.danger,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  footerText: {
    flexShrink: 1,
    maxWidth: 320,
    lineHeight: 17,
    textAlign: 'center',
  },
});
