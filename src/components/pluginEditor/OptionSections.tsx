import React from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, EmptyState, Txt } from '../ui';
import { NativeIcon } from '../NativeIcon';
import { SettingsGroup } from '../settings/SettingsGroup';
import { optionTypeLabel, type OptionSection } from '../../features/plugins/optionSchema';
import { colors, font, spacing } from '../../theme/theme';

function Row({ title, detail, accent, onPress }: { title: string; detail?: string; accent?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {accent ? <Ionicons name="add-circle" size={20} color={colors.primary} /> : null}
      <Txt numberOfLines={1} style={[styles.grow, accent && styles.accent]}>{title}</Txt>
      {detail ? <Txt variant="faint" numberOfLines={1}>{detail}</Txt> : null}
      {accent ? null : <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />}
    </Pressable>
  );
}

/** The plugin's option sections; tapping an option opens it, as the desktop's builder list does. */
export function OptionSections({
  sections,
  onChange,
  onEdit,
}: {
  sections: OptionSection[];
  onChange: (sections: OptionSection[]) => void;
  /** `index` is null to add a new option to the section. */
  onEdit: (section: number, index: number | null) => void;
}) {
  const addSection = () => {
    onChange([...sections, { name: sections.length ? 'More options' : 'General', options: [] }]);
    return sections.length;
  };
  const update = (index: number, section: OptionSection | null) =>
    onChange(section ? sections.map((item, at) => (at === index ? section : item)) : sections.filter((_, at) => at !== index));
  const remove = (index: number) => {
    const count = sections[index].options.length;
    if (!count) return update(index, null);
    Alert.alert('Delete section?', `Its ${count === 1 ? 'option' : `${count} options`} will be deleted too.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => update(index, null) },
    ]);
  };

  if (!sections.length) {
    return (
      <EmptyState
        icon={<NativeIcon sf="slider.horizontal.3" material="tune" size={36} color={colors.textFaint} />}
        title="No options yet"
        subtitle="Options let people change how the plugin runs without touching its code."
        actionLabel="Add option"
        onAction={() => onEdit(addSection(), null)}
      />
    );
  }

  return (
    <>
      {sections.map((section, index) => (
        <SettingsGroup key={index}>
          <View style={styles.row}>
            <TextInput
              accessibilityLabel="Section name"
              value={section.name}
              maxLength={40}
              placeholder="Section name"
              placeholderTextColor={colors.textFaint}
              onChangeText={(name) => update(index, { ...section, name })}
              style={[styles.grow, styles.sectionName]}
            />
            <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${section.name || 'section'}`} hitSlop={8} onPress={() => remove(index)} style={styles.icon}>
              <NativeIcon sf="trash" material="delete-outline" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          {section.options.map((option, at) => (
            <Row key={option.id || at} title={option.label || 'Untitled'} detail={optionTypeLabel(option.type)} onPress={() => onEdit(index, at)} />
          ))}
          <Row title="Add option" accent onPress={() => onEdit(index, null)} />
        </SettingsGroup>
      ))}
      <Button title="Add section" variant="secondary" full onPress={addSection} />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  grow: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.6 },
  accent: { color: colors.primary },
  sectionName: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold, paddingVertical: spacing.xs },
  icon: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
});
