import React from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { NativeIcon } from "../NativeIcon";
import { Divider, EmptyState, Txt } from "../ui";
import type { Chain } from "../../store/types";
import { chainPluginId } from "../../generated/client-contract/chains";
import { formatDuration } from "../../generated/client-contract/cooldowns";
import { colors, radii, spacing } from "../../theme/theme";

export function ChainList({
  chains,
  runningIds,
  onCreate,
  onOpen,
}: {
  chains: (Chain & { description?: string; readyAt?: number })[];
  runningIds: ReadonlySet<string | undefined>;
  onCreate: () => void;
  onOpen: (chain: Chain) => void;
}) {
  return (
    <FlatList
      data={chains}
      keyExtractor={(chain) => chain.id}
      contentContainerStyle={chains.length ? styles.list : styles.emptyList}
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={7}
      renderItem={({ item, index }) => (
        <>
          {index > 0 ? <Divider /> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.name ?? "chain"}`}
            onPress={() => onOpen(item)}
            style={({ pressed }) => [
              styles.card,
              index === 0 && styles.cardFirst,
              index === chains.length - 1 && styles.cardLast,
              pressed && styles.rowPressed,
            ]}
          >
            <View style={styles.icon}><NativeIcon sf="point.3.connected.trianglepath.dotted" material="account-tree" size={21} color={colors.primary} /></View>
            <View style={styles.copy}>
              <Txt variant="heading" numberOfLines={1}>{item.name ?? "Unnamed chain"}</Txt>
              <Txt variant="muted" numberOfLines={1}>{item.description || `${item.chains.length === 1 ? "1 action" : `${item.chains.length} actions`} · Runs in order for each account`}</Txt>
            </View>
            {runningIds.has(chainPluginId(item.id))
              ? <View style={styles.running}><View style={styles.dot} /><Txt variant="faint" style={styles.runningText}>Running</Txt></View>
              : item.readyAt !== undefined && item.readyAt > Date.now()
                ? <Txt variant="faint">{formatDuration(item.readyAt - Date.now())}</Txt>
                : null}
            <NativeIcon sf="chevron.right" material="chevron-right" size={18} color={colors.textFaint} />
          </Pressable>
        </>
      )}
      ListEmptyComponent={
        <EmptyState
          icon={<NativeIcon sf="link" material="link" size={40} color={colors.textFaint} />}
          title="No chains yet"
          subtitle="A chain runs several scripts or plugins one after another on each account you select, so a whole routine happens hands-free."
          actionLabel="Create a chain"
          onAction={onCreate}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  emptyList: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  card: { minHeight: 76, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth, borderColor: colors.borderSubtle },
  cardFirst: { borderTopWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, borderCurve: "continuous" },
  cardLast: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg, borderCurve: "continuous" },
  rowPressed: { backgroundColor: colors.surfaceHover },
  icon: { width: 42, height: 42, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  running: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 7, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: colors.successSoft },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  runningText: { color: colors.success, fontWeight: "700" },
});
