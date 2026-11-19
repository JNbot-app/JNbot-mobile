import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BottomSheet } from '../BottomSheet';
import { NativeIcon } from '../NativeIcon';
import { PickerField } from '../PickerField';
import { type Choice } from '../PluginOptions';
import { Button, IconButton, Txt } from '../ui';
import { useClient } from '../../net/ConnectionProvider';
import { actions, useStore } from '../../store/store';
import {
  DEFAULT_PRESET,
  pluginPresets,
  presetValues,
  PRESET_OPTION,
  PRESETS_KEY,
  selectedPresetId,
} from '../../generated/client-contract/pluginPresets';
import { colors, font, radii, spacing } from '../../theme/theme';

type Stored = Record<string, any> | undefined;
type IconProps = React.ComponentProps<typeof NativeIcon>;
type NameForm = { title: string; initial: string; save: (name: string) => void };

/** Picker choices for a plugin's presets; empty while it has none. */
export function presetChoices(stored: Stored): Choice[] {
  const presets = Object.entries(pluginPresets(stored));
  return presets.length
    ? [
        { label: 'Default', value: DEFAULT_PRESET },
        ...presets.map(([value, { name }]) => ({ label: name, value })),
      ]
    : [];
}

/**
 * Switches between a plugin's presets above its options. Stays a single quiet
 * button until the user creates a preset. Same behaviour as the desktop
 * PresetBar.
 */
export function PresetBar({
  pluginId,
  onBeforeChange,
}: {
  pluginId: string;
  /** Saves pending option edits before the selected preset changes. */
  onBeforeChange: () => Promise<void>;
}) {
  const client = useClient();
  const stored = useStore((state) => state.settings.scripts?.[pluginId]);
  const [sheet, setSheet] = useState<'menu' | NameForm | null>(null);
  const choices = presetChoices(stored);
  const selected = selectedPresetId(stored);
  const current = pluginPresets(stored)[selected];

  const updatePresets = async (update: (next: Record<string, any>) => void) => {
    if (!client) return;
    await onBeforeChange();
    const next = JSON.parse(JSON.stringify(useStore.getState().settings.scripts?.[pluginId] ?? {}));
    update(next);
    const patches = [
      { path: ['scripts', pluginId, PRESETS_KEY], value: next[PRESETS_KEY] },
      { path: ['scripts', pluginId, PRESET_OPTION], value: next[PRESET_OPTION] },
    ];
    actions.applySettingsPatches(patches);
    await client.updateSettings(patches);
  };

  const create = () =>
    setSheet({
      title: 'New preset',
      initial: '',
      // Starts from the options on screen, and switches to it.
      save: (name) =>
        updatePresets((next) => {
          const presetId = Math.random().toString(36).slice(2, 10);
          const values = JSON.parse(JSON.stringify(presetValues(next)));
          (next[PRESETS_KEY] ??= {})[presetId] = { name, values };
          next[PRESET_OPTION] = presetId;
        }),
    });

  const rename = () =>
    current &&
    setSheet({
      title: 'Rename preset',
      initial: current.name,
      save: (name) =>
        updatePresets((next) => {
          next[PRESETS_KEY][selected].name = name;
        }),
    });

  const remove = () => {
    if (!current) return;
    setSheet(null);
    Alert.alert(
      `Delete "${current.name}"?`,
      'Schedules, chains and triggers using this preset will use Default.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            void updatePresets((next) => {
              delete next[PRESETS_KEY][selected];
              next[PRESET_OPTION] = DEFAULT_PRESET;
            }),
        },
      ],
    );
  };

  return (
    <>
      {choices.length ? (
        <View style={styles.bar}>
          <View style={styles.picker}>
            <PickerField
              title="Preset"
              options={choices}
              value={current ? selected : DEFAULT_PRESET}
              onChange={(presetId) =>
                void updatePresets((next) => {
                  next[PRESET_OPTION] = String(presetId);
                })
              }
            />
          </View>
          <IconButton accessibilityLabel="Preset actions" onPress={() => setSheet('menu')}>
            <NativeIcon sf="ellipsis" material="more-horiz" size={20} color={colors.text} />
          </IconButton>
        </View>
      ) : (
        <Button
          title="New preset"
          variant="ghost"
          small
          style={styles.newButton}
          accessibilityLabel="New preset. Save these options under a name to switch between them or run them side by side."
          icon={<NativeIcon sf="plus" material="add" size={16} color={colors.textMuted} />}
          onPress={create}
        />
      )}
      <BottomSheet visible={sheet !== null} onClose={() => setSheet(null)} accessibilityLabel="Preset">
        {sheet === 'menu' ? (
          <View style={styles.menu}>
            <MenuRow sf="plus" material="add" title="New preset" onPress={create} />
            {current ? (
              <>
                <MenuRow sf="pencil" material="edit" title="Rename" onPress={rename} />
                <MenuRow sf="trash" material="delete" title="Delete" danger onPress={remove} />
              </>
            ) : null}
          </View>
        ) : sheet ? (
          <NameSheet
            key={sheet.title}
            form={sheet}
            onSave={(name) => {
              setSheet(null);
              void sheet.save(name);
            }}
          />
        ) : null}
      </BottomSheet>
    </>
  );
}

function MenuRow({
  sf,
  material,
  title,
  danger,
  onPress,
}: {
  sf: IconProps['sf'];
  material: IconProps['material'];
  title: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const color = danger ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
    >
      <NativeIcon sf={sf} material={material} size={21} color={color} />
      <Txt variant="heading" style={{ color }}>{title}</Txt>
    </Pressable>
  );
}

function NameSheet({ form, onSave }: { form: NameForm; onSave: (name: string) => void }) {
  const [name, setName] = useState(form.initial);
  const trimmed = name.trim();
  const submit = () => trimmed && onSave(trimmed);
  return (
    <View style={styles.nameSheet}>
      <Txt variant="heading">{form.title}</Txt>
      <TextInput
        autoFocus
        accessibilityLabel="Preset name"
        value={name}
        onChangeText={setName}
        onSubmitEditing={submit}
        returnKeyType="done"
        maxLength={40}
        placeholder="e.g. Alts 11-20"
        placeholderTextColor={colors.textFaint}
        style={styles.nameInput}
      />
      <Button title="Save" full disabled={!trimmed} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  picker: { flex: 1, minWidth: 0 },
  newButton: { alignSelf: 'flex-end' },
  pressed: { opacity: 0.7 },
  menu: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  menuRow: {
    minHeight: process.env.EXPO_OS === 'android' ? 52 : 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  nameSheet: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
  nameInput: {
    minHeight: process.env.EXPO_OS === 'android' ? 52 : 48,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    color: colors.text,
    fontSize: font.size.md,
  },
});
