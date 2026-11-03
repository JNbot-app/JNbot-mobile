import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useMonetization } from '../../monetization/MonetizationProvider';
import { colors, radii, spacing } from '../../theme/theme';
import { NativeIcon } from '../NativeIcon';
import { IconButton, Txt } from '../ui';

const DISMISSED_KEY = '@jnbot/monetization/ad-free-offer-dismissed-v1';

export function AdFreeOfferCard() {
  const router = useRouter();
  const { ready, isAdFree, purchaseAvailable, hasSeenAd, removeAdsPrice } = useMonetization();
  const [dismissalLoaded, setDismissalLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(DISMISSED_KEY)
      .then((value) => {
        if (!mounted) return;
        setDismissed(value === '1');
        setDismissalLoaded(true);
      })
      .catch(() => {
        if (mounted) setDismissalLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (
    Platform.OS !== 'android' ||
    !dismissalLoaded ||
    dismissed ||
    !ready ||
    !hasSeenAd ||
    isAdFree ||
    !purchaseAvailable
  ) {
    return null;
  }

  const dismiss = () => {
    setDismissed(true);
    void AsyncStorage.setItem(DISMISSED_KEY, '1').catch(() => undefined);
  };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ads forever. One-time purchase${removeAdsPrice ? `, ${removeAdsPrice}` : ''}. Open Shop`}
        onPress={() => router.push('/(app)/shop')}
        style={({ pressed }) => [styles.offer, pressed && styles.offerPressed]}
      >
        <View style={styles.icon}>
          <NativeIcon sf="bag" material="shopping-bag" size={18} color={colors.primary} />
        </View>
        <View style={styles.copy}>
          <Txt style={styles.title} numberOfLines={1}>Remove ads forever</Txt>
          <Txt variant="muted" numberOfLines={1}>
            {removeAdsPrice ? `One-time purchase · ${removeAdsPrice}` : 'One-time purchase'}
          </Txt>
        </View>
        <NativeIcon sf="chevron.right" material="chevron-right" size={17} color={colors.textMuted} />
      </Pressable>
      <IconButton
        accessibilityLabel="Dismiss remove ads offer"
        bg="transparent"
        onPress={dismiss}
      >
        <NativeIcon sf="xmark" material="close" size={18} color={colors.textMuted} />
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  offer: {
    flex: 1,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
  },
  offerPressed: {
    backgroundColor: colors.surfaceHover,
  },
  icon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontWeight: '600',
  },
});
