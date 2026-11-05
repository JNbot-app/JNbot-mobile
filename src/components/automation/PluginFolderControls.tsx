import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { colors, font, radii, spacing } from '../../theme/theme';
import { BottomSheet } from '../BottomSheet';
import { NativeIcon } from '../NativeIcon';
import { Button, Txt } from '../ui';

export type FolderChoice = {
  id: string;
  label: string;
  folder: string | null;
  count?: number;
};

export function FolderStrip({
  choices,
  selected,
  onSelect,
  onManage,
}: {
  choices: FolderChoice[];
  selected: string;
  onSelect: (id: string) => void;
  onManage: (folder: string) => void;
}) {
  const renderItem = ({ item }: { item: FolderChoice }) => {
    const active = selected === item.id;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`${item.label}, ${item.count ?? 0} plugins`}
        accessibilityHint={item.folder ? 'Opens folder. Long press for folder actions.' : 'Shows these plugins.'}
        onPress={() => onSelect(item.id)}
        onLongPress={item.folder ? () => onManage(item.folder!) : undefined}
        delayLongPress={400}
        style={({ pressed }) => [
          styles.folderChip,
          active && styles.folderChipActive,
          pressed && styles.pressed,
        ]}
      >
        <NativeIcon
          sf={active && item.folder ? 'folder.fill' : item.folder ? 'folder' : item.id === '__none__' ? 'tray' : 'square.grid.2x2'}
          material={active && item.folder ? 'folder' : item.folder ? 'folder' : item.id === '__none__' ? 'inbox' : 'grid-view'}
          size={16}
          color={active ? colors.primary : colors.textMuted}
        />
        <Txt variant="label" numberOfLines={1} style={[styles.folderLabel, active && styles.folderLabelActive]}>
          {item.label}
        </Txt>
        <Txt variant="faint" style={styles.folderCount}>{item.count ?? 0}</Txt>
      </Pressable>
    );
  };

  return (
    <FlatList
      horizontal
      data={choices}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.folderStrip}
      keyboardShouldPersistTaps="handled"
    />
  );
}

export function FolderPickerSheet({
  visible,
  pluginName,
  choices,
  selectedFolder,
  onSelect,
  onClose,
}: {
  visible: boolean;
  pluginName: string;
  choices: FolderChoice[];
  selectedFolder?: string;
  onSelect: (folder: string | null) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Move plugin">
      <View style={styles.sheetHeader}>
        <Txt variant="heading">Move to folder</Txt>
        <Txt variant="muted" numberOfLines={1}>{pluginName}</Txt>
      </View>
      <FlatList
        data={choices}
        keyExtractor={(item) => item.id}
        style={styles.pickerList}
        contentContainerStyle={styles.pickerContent}
        renderItem={({ item }) => {
          const selected = item.folder === (selectedFolder ?? null);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onSelect(item.folder)}
              style={({ pressed }) => [styles.pickerRow, pressed && styles.pressed]}
            >
              <NativeIcon sf={item.folder ? 'folder' : 'tray'} material={item.folder ? 'folder' : 'inbox'} size={21} color={colors.textMuted} />
              <Txt variant="heading" numberOfLines={1} style={styles.pickerLabel}>{item.label}</Txt>
              {selected ? <NativeIcon sf="checkmark" material="check" size={19} color={colors.primary} /> : null}
            </Pressable>
          );
        }}
      />
    </BottomSheet>
  );
}

export function FolderNameSheet({
  visible,
  existingNames,
  onCreate,
  onClose,
}: {
  visible: boolean;
  existingNames: string[];
  onCreate: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const normalized = name.trim().replace(/\s+/g, ' ').slice(0, 60);
  const duplicate = existingNames.some((folder) => folder.toLocaleLowerCase() === normalized.toLocaleLowerCase());
  useEffect(() => {
    if (visible) setName('');
  }, [visible]);
  const submit = () => {
    if (!normalized || duplicate) return;
    onCreate(normalized);
  };
  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="New folder">
      <View style={styles.nameSheet}>
        <Txt variant="heading">New folder</Txt>
        <TextInput
          autoFocus
          accessibilityLabel="Folder name"
          value={name}
          onChangeText={setName}
          onSubmitEditing={submit}
          returnKeyType="done"
          maxLength={60}
          placeholder="Folder name"
          placeholderTextColor={colors.textFaint}
          style={styles.nameInput}
        />
        {duplicate ? <Txt variant="faint" style={styles.nameError}>A folder with this name already exists.</Txt> : null}
        <Button title="Create folder" full disabled={!normalized || duplicate} onPress={submit} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  folderStrip: { gap: spacing.sm, paddingBottom: spacing.md },
  folderChip: {
    minHeight: 32,
    maxWidth: 190,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  folderChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primaryDim },
  folderLabel: { flexShrink: 1, fontSize: font.size.caption, color: colors.textMuted },
  folderLabelActive: { color: colors.primary },
  folderCount: { fontVariant: ['tabular-nums'] },
  sheetHeader: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: 2 },
  pickerList: { maxHeight: 410 },
  pickerContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  pickerRow: { minHeight: process.env.EXPO_OS === 'android' ? 52 : 48, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radii.md },
  pickerLabel: { flex: 1, minWidth: 0 },
  nameSheet: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
  nameInput: { minHeight: process.env.EXPO_OS === 'android' ? 52 : 48, paddingHorizontal: spacing.md, borderRadius: radii.md, borderCurve: 'continuous', backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, color: colors.text, fontSize: font.size.md },
  nameError: { color: colors.danger, marginTop: -spacing.sm },
});
