import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { ScreenSafeArea } from '../src/components/ScreenSafeArea';
import { useConnection } from '../src/net/ConnectionProvider';
import { useStore } from '../src/store/store';
import { colors, radii, spacing } from '../src/theme/theme';
import { Txt } from '../src/components/ui';
import { JNbotLogo } from '../src/components/JNbotLogo';

/** Entry gate — shows a polished native loading screen while connecting and loading the last profile, or routes to pairing. */
export default function Index() {
  const router = useRouter();
  const { ready, hasTarget, status, target, disconnect } = useConnection();
  const activeProfileKey = useStore((state) => state.activeProfileKey);

  const statusLabel = useMemo(() => {
    if (!ready) return 'Starting JNbot…';
    if (target?.kind === 'remote') {
      switch (status) {
        case 'signaling':
          return 'Connecting to desktop host…';
        case 'negotiating':
          return 'Opening secure link…';
        case 'synchronizing':
          return 'Loading profile & bot state…';
        case 'reconnecting':
          return 'Reconnecting to desktop…';
        default:
          return 'Connecting to remote JNbot…';
      }
    }
    if (target?.kind === 'local') {
      switch (status) {
        case 'signaling':
          return 'Starting local runtime…';
        case 'synchronizing':
          return 'Loading profile & bot state…';
        default:
          return 'Starting local JNbot…';
      }
    }
    return 'Loading last used profile…';
  }, [ready, status, target?.kind]);

  const handleCancel = async () => {
    await disconnect();
    router.replace({ pathname: '/connect', params: { returnTo: '/(app)/dashboard' } });
  };

  // 1. Initial storage check not yet finished
  if (!ready) {
    return (
      <ScreenSafeArea style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.center}>
          <JNbotLogo size={72} />
          <Txt variant="title" style={styles.title}>JNbot Mobile</Txt>
          <View style={styles.statusBox}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Txt variant="muted">{statusLabel}</Txt>
          </View>
        </View>
      </ScreenSafeArea>
    );
  }

  // 2. No saved runtime target -> go to start screen
  if (!hasTarget) {
    return <Redirect href="/connect" />;
  }

  // 3. Runtime connected successfully
  if (status === 'connected') {
    return <Redirect href={activeProfileKey ? '/(app)/dashboard' : '/(app)/profiles'} />;
  }

  // 4. Connection failed or explicitly disconnected -> redirect to start screen
  if (status === 'error' || status === 'disconnected') {
    return <Redirect href="/connect" />;
  }

  // 5. In-progress connection & profile loading
  return (
    <ScreenSafeArea style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.center}>
        <JNbotLogo size={72} />
        <Txt variant="title" style={styles.title}>JNbot Mobile</Txt>
        <View style={styles.statusBox}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Txt variant="muted">{statusLabel}</Txt>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={() => void handleCancel()}
          style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelButtonPressed]}
        >
          <Txt variant="faint">Choose a different runtime</Txt>
        </Pressable>
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  title: {
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  cancelButtonPressed: {
    backgroundColor: colors.surfaceHover,
  },
});
