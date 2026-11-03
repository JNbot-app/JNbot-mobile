import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Txt } from '../ui';
import { colors, spacing } from '../../theme/theme';

type Section = 'scripts' | 'plugins' | 'chains' | 'cooldowns' | 'triggers';

export function AutomationTabs({
  sections,
  selected,
  onSelect,
}: {
  sections: ReadonlyArray<{ id: Section; label: string }>;
  selected: Section;
  onSelect: (section: Section) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      <View style={styles.tabs} accessibilityRole="tablist" accessibilityLabel="Automation sections">
        {sections.map((section) => {
          const active = selected === section.id;
          return (
            <Pressable
              key={section.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => {
                if (active) return;
                if (Platform.OS === 'ios') void Haptics.selectionAsync().catch(() => { });
                onSelect(section.id);
              }}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            >
              <Txt variant="label" style={[styles.label, active && styles.activeLabel]}>
                {section.label}
              </Txt>
              {active ? <View pointerEvents="none" style={styles.indicator} /> : null}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, marginHorizontal: spacing.lg, marginTop: -spacing.lg, marginBottom: spacing.md },
  content: { flexGrow: 1 },
  tabs: { flexGrow: 1, flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
  tab: {
    flexGrow: 1, flexShrink: 0,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  indicator: {
    position: 'absolute', bottom: 0, left: spacing.md, right: spacing.md,
    height: 2, borderRadius: 1, backgroundColor: colors.primary,
  },
  label: { color: colors.textMuted },
  activeLabel: { color: colors.primary },
  pressed: { opacity: 0.7 },
});
