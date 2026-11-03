import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { NativeIcon } from '../../components/NativeIcon';
import { Txt } from '../../components/ui';
import { shareSummary, type MarketEntry, type ShareInstallState } from '../../generated/client-contract/share';
import { colors, font, spacing } from '../../theme/theme';
import { KindTile } from './KindTile';

export const ROW_TILE = 60;
export const ROW_INSET = ROW_TILE + spacing.md;

function Action({ entry, state, busy, onGet }: { entry: MarketEntry; state: ShareInstallState; busy: boolean; onGet: () => void }) {
  if (!entry.canInstall) return <Txt variant="faint" style={{ color: colors.warning }}>Needs {entry.listing.minAppVersion}</Txt>;
  if (state === 'own') return <Txt variant="faint">Yours</Txt>;
  if (state === 'installed') return <NativeIcon sf="checkmark.circle.fill" material="check-circle" size={24} color={colors.success} />;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${state === 'update' ? 'Update' : 'Get'} ${entry.listing.title}`}
      disabled={busy}
      hitSlop={8}
      onPress={onGet}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      {busy ? <ActivityIndicator size="small" color={colors.primary} /> : <Txt variant="none" style={styles.pillLabel}>{state === 'update' ? 'Update' : 'Get'}</Txt>}
    </Pressable>
  );
}

/** One catalog entry as a store row: icon, title, one line of detail, and its install action. */
export function MarketRow({ entry, installState, busy, onPress, onGet }: { entry: MarketEntry; installState: ShareInstallState; busy: boolean; onPress: () => void; onGet: () => void }) {
  const { listing, publisher } = entry;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${listing.title} by ${publisher.name}`}
      onPress={() => {
        if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <KindTile kind={entry.kind} color={listing.color} src={entry.bannerUrl} size={ROW_TILE} />
      <View style={styles.copy}>
        <View style={styles.titleLine}>
          <Txt variant="none" numberOfLines={1} style={styles.title}>{listing.title}</Txt>
          {publisher.official ? <NativeIcon sf="checkmark.seal.fill" material="verified" size={14} color={colors.primary} /> : null}
        </View>
        <Txt variant="muted" numberOfLines={1}>{listing.description || publisher.name}</Txt>
        <Txt variant="faint" numberOfLines={1}>{(listing.description ? [shareSummary(listing), publisher.name] : [shareSummary(listing)]).filter(Boolean).join(' · ')}</Txt>
      </View>
      <Action entry={entry} state={installState} busy={busy} onGet={onGet} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: ROW_TILE + spacing.md * 2, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  pressed: { opacity: 0.6 },
  copy: { flex: 1, minWidth: 0, gap: 1 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { flexShrink: 1, fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  pill: { minWidth: 64, height: 32, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: 16, backgroundColor: colors.primarySoft },
  pillLabel: { fontSize: font.size.sm, fontWeight: font.weight.bold, color: colors.primary },
});
