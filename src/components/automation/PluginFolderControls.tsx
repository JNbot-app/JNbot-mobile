import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import type { MacroInfo } from '../../store/types';
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

export const DROP_ROW_HEIGHT = process.env.EXPO_OS === 'android' ? 52 : 48;

export const DraggablePluginRow = React.memo(function DraggablePluginRow({
  plugin,
  enabled,
  onStart,
  onMove,
  onFinish,
  onCancel,
  children,
}: {
  plugin: MacroInfo;
  enabled: boolean;
  onStart: (plugin: MacroInfo) => void;
  onMove: (absoluteY: number) => void;
  onFinish: (plugin: MacroInfo) => void;
  onCancel: (plugin: MacroInfo) => void;
  children: React.ReactNode;
}) {
  const pan = useMemo(
    () => Gesture.Pan()
      .enabled(enabled)
      .activateAfterLongPress(280)
      .minDistance(0)
      .onStart(() => {
        runOnJS(onStart)(plugin);
        if (process.env.EXPO_OS === 'ios') {
          runOnJS(vibrate)();
        }
      })
      .onUpdate((event) => runOnJS(onMove)(event.absoluteY))
      .onEnd(() => runOnJS(onFinish)(plugin))
      .onFinalize((_event, success) => {
        if (!success) runOnJS(onCancel)(plugin);
      }),
    [enabled, onCancel, onFinish, onMove, onStart, plugin],
  );

  return <GestureDetector gesture={pan}><View>{children}</View></GestureDetector>;
});

function vibrate() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

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

export function FolderDropTray({
  plugin,
  choices,
  activeId,
  onTopChange,
}: {
  plugin: MacroInfo;
  choices: FolderChoice[];
  activeId: string | null;
  onTopChange: (top: number) => void;
}) {
  const listRef = useRef<React.ElementRef<typeof View>>(null);
  const measure = () => {
    requestAnimationFrame(() => {
      listRef.current?.measureInWindow((_x, y) => onTopChange(y));
    });
  };
  return (
    <View pointerEvents="none" style={styles.dropOverlay}>
      <View style={styles.dropTray}>
        <View style={styles.dropHeading}>
          <View style={styles.dragIcon}>
            <NativeIcon sf="shippingbox.fill" material="extension" size={18} color={colors.primary} />
          </View>
          <View style={styles.dropTitle}>
            <Txt variant="heading" numberOfLines={1}>{plugin.name}</Txt>
            <Txt variant="faint">Drop into a folder</Txt>
          </View>
        </View>
        <View ref={listRef} onLayout={measure}>
          {choices.map((choice) => {
            const active = choice.id === activeId;
            return (
              <View key={choice.id} style={[styles.dropRow, active && styles.dropRowActive]}>
                <NativeIcon
                  sf={choice.id === '__more__' ? 'ellipsis.circle' : choice.folder ? 'folder.fill' : 'tray.fill'}
                  material={choice.id === '__more__' ? 'more-horiz' : choice.folder ? 'folder' : 'inbox'}
                  size={20}
                  color={active ? colors.primary : colors.textMuted}
                />
                <Txt variant="heading" numberOfLines={1} style={styles.dropRowText}>{choice.label}</Txt>
                {active ? <NativeIcon sf="arrow.down.circle.fill" material="arrow-circle-down" size={20} color={colors.primary} /> : null}
              </View>
            );
          })}
        </View>
      </View>
    </View>
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
    minHeight: 36,
    maxWidth: 190,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  folderChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primaryDim },
  folderLabel: { flexShrink: 1, fontSize: font.size.caption, color: colors.textMuted },
  folderLabelActive: { color: colors.primary },
  folderCount: { fontVariant: ['tabular-nums'] },
  dropOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 20, justifyContent: 'flex-end', padding: spacing.md, backgroundColor: colors.overlay },
  dropTray: { overflow: 'hidden', borderRadius: radii.xl, borderCurve: 'continuous', backgroundColor: colors.bgElevated },
  dropHeading: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
  dragIcon: { width: 36, height: 36, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  dropTitle: { flex: 1, minWidth: 0 },
  dropRow: { height: DROP_ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md },
  dropRowActive: { backgroundColor: colors.primarySoft },
  dropRowText: { flex: 1, minWidth: 0 },
  sheetHeader: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: 2 },
  pickerList: { maxHeight: 410 },
  pickerContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  pickerRow: { minHeight: process.env.EXPO_OS === 'android' ? 52 : 48, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radii.md },
  pickerLabel: { flex: 1, minWidth: 0 },
  nameSheet: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
  nameInput: { minHeight: process.env.EXPO_OS === 'android' ? 52 : 48, paddingHorizontal: spacing.md, borderRadius: radii.md, borderCurve: 'continuous', backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, color: colors.text, fontSize: font.size.md },
  nameError: { color: colors.danger, marginTop: -spacing.sm },
});
