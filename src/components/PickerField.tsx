import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Txt } from './ui';
import { colors, font, radii, spacing } from '../theme/theme';

export type Choice = {
  label: string;
  value: string | number;
  description?: string;
};

const optionLabel = (options: Choice[], value: unknown) =>
  options.find((item) => item.value === value)?.label ?? String(value ?? '');

export function PickerModal({
  visible,
  title,
  options,
  value,
  multiple,
  clearable,
  freeSolo,
  onChange,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: Choice[];
  value: unknown;
  multiple: boolean;
  clearable?: boolean;
  freeSolo?: boolean;
  onChange: (value: unknown) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [customChoices, setCustomChoices] = useState<Choice[]>([]);

  const selected: (string | number)[] = useMemo(() => {
    if (!multiple) {
      return value !== undefined && value !== null && value !== ''
        ? [value as string | number]
        : [];
    }
    return (Array.isArray(value) ? value : []).filter(
      (entry) => entry !== undefined && entry !== null && entry !== '',
    ) as (string | number)[];
  }, [multiple, value]);

  useEffect(() => {
    if (visible) {
      setQuery('');
      const optionValues = new Set(options.map((item) => item.value));
      const existingCustom = selected
        .filter((entry) => !optionValues.has(entry))
        .map((entry) => ({
          label: String(entry),
          value: entry,
          description: 'Custom value',
        }));
      setCustomChoices(existingCustom);
    }
  }, [visible]);

  const allOptions = useMemo(() => {
    const optionValues = new Set(options.map((item) => item.value));
    const uniqueCustom = customChoices.filter((c) => !optionValues.has(c.value));
    return [...uniqueCustom, ...options];
  }, [options, customChoices]);

  const filtered = useMemo(
    () =>
      allOptions.filter((item) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          item.label.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q))
        );
      }),
    [allOptions, query],
  );

  const choose = (item: Choice) => {
    if (!multiple) {
      onChange(item.value);
      onClose();
      return;
    }
    onChange(
      selected.includes(item.value)
        ? selected.filter((entry) => entry !== item.value)
        : [...selected, item.value],
    );
  };

  const removeCustom = (itemValue: string | number) => {
    setCustomChoices((prev) => prev.filter((c) => c.value !== itemValue));
    if (multiple) {
      onChange(selected.filter((entry) => entry !== itemValue));
    } else if (value === itemValue) {
      onChange(undefined);
    }
  };

  const removeSelected = (itemValue: string | number) => {
    if (multiple) {
      onChange(selected.filter((entry) => entry !== itemValue));
    } else {
      onChange(undefined);
    }
    const isPredefined = options.some((item) => item.value === itemValue);
    if (!isPredefined) {
      setCustomChoices((prev) => prev.filter((c) => c.value !== itemValue));
    }
  };

  const commitQuery = () => {
    const custom = query.trim();
    if (!custom) return;
    const existing = allOptions.find(
      (item) =>
        String(item.value).toLowerCase() === custom.toLowerCase() ||
        item.label.toLowerCase() === custom.toLowerCase(),
    );
    if (existing) {
      choose(existing);
      setQuery('');
      return;
    }
    if (!freeSolo) return;
    if (!multiple) {
      onChange(custom);
      onClose();
      return;
    }
    const newChoice: Choice = {
      label: custom,
      value: custom,
      description: 'Custom value',
    };
    setCustomChoices((prev) => [
      newChoice,
      ...prev.filter((c) => c.value !== custom),
    ]);
    if (!selected.includes(custom)) {
      onChange([...selected, custom]);
    }
    setQuery('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.pickerSheet} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <View style={styles.pickerHeader}>
            <Pressable hitSlop={10} onPress={onClose}>
              <Txt variant="body" style={{ color: colors.primary }}>
                Cancel
              </Txt>
            </Pressable>
            <Txt
              variant="heading"
              numberOfLines={1}
              style={{ flex: 1, textAlign: 'center' }}
            >
              {title}
            </Txt>
            <Pressable hitSlop={10} onPress={onClose}>
              <Txt variant="body" style={{ color: colors.primary }}>
                {multiple ? 'Done' : 'Close'}
              </Txt>
            </Pressable>
          </View>
          <View style={styles.search}>
            <Ionicons name="search" size={18} color={colors.textFaint} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={commitQuery}
              returnKeyType="done"
              placeholder={freeSolo ? 'Search or enter a custom value' : 'Search'}
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.searchInput}
            />
          </View>
          {freeSolo &&
          query.trim() &&
          !allOptions.some(
            (item) =>
              String(item.value).toLowerCase() === query.trim().toLowerCase() ||
              item.label.toLowerCase() === query.trim().toLowerCase(),
          ) ? (
            <Pressable onPress={commitQuery} style={styles.customChoice}>
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={colors.primary}
              />
              <Txt variant="body">Use “{query.trim()}”</Txt>
            </Pressable>
          ) : null}
          {multiple && selected.length > 0 ? (
            <View style={styles.modalChipsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalChipsScroll}
              >
                {selected.map((val) => {
                  const itemLabel = optionLabel(allOptions, val);
                  return (
                    <View key={String(val)} style={styles.chip}>
                      <Txt variant="faint" numberOfLines={1} style={styles.chipText}>
                        {itemLabel}
                      </Txt>
                      <Pressable
                        hitSlop={8}
                        onPress={() => removeSelected(val)}
                        style={styles.chipRemove}
                        accessibilityLabel={`Remove ${itemLabel}`}
                      >
                        <Ionicons name="close" size={14} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.value)}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.pickerList}
            renderItem={({ item }) => {
              const active = selected.includes(item.value);
              const isCustom = customChoices.some((c) => c.value === item.value);
              return (
                <Pressable onPress={() => choose(item)} style={styles.pickerRow}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.rowTitleContainer}>
                      <Txt variant="body" numberOfLines={1} style={{ flexShrink: 1 }}>
                        {item.label}
                      </Txt>
                      {isCustom ? (
                        <Badge
                          label="Custom"
                          color={colors.primary}
                          bg={colors.primarySoft}
                        />
                      ) : null}
                    </View>
                    {item.description ? (
                      <Txt variant="faint" numberOfLines={2}>
                        {item.description}
                      </Txt>
                    ) : null}
                  </View>
                  <View style={styles.rowActions}>
                    {isCustom ? (
                      <Pressable
                        hitSlop={8}
                        onPress={() => removeCustom(item.value)}
                        style={styles.trashBtn}
                        accessibilityLabel={`Delete custom value ${item.label}`}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      </Pressable>
                    ) : null}
                    <Ionicons
                      name={
                        multiple
                          ? active
                            ? 'checkbox'
                            : 'square-outline'
                          : active
                            ? 'radio-button-on'
                            : 'radio-button-off'
                      }
                      size={22}
                      color={active ? colors.primary : colors.textFaint}
                    />
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyPicker}>
                <Txt variant="muted">No matching options</Txt>
              </View>
            }
          />
          {clearable || multiple ? (
            <View style={styles.pickerActions}>
              {clearable ? (
                <Button
                  title="Clear selection"
                  variant="secondary"
                  full
                  onPress={() => {
                    onChange(multiple ? [] : undefined);
                    setCustomChoices([]);
                    onClose();
                  }}
                />
              ) : null}
              {multiple ? <Button title="Done" full onPress={onClose} /> : null}
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export function PickerField({
  title,
  options,
  value,
  multiple = false,
  clearable,
  freeSolo,
  placeholder = 'Choose an option',
  onChange,
}: {
  title: string;
  options: Choice[];
  value: unknown;
  multiple?: boolean;
  clearable?: boolean;
  freeSolo?: boolean;
  placeholder?: string;
  onChange: (value: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const values = multiple ? (Array.isArray(value) ? value : []) : [value];
  const validValues = values.filter(
    (entry) => entry !== undefined && entry !== null && entry !== '',
  ) as (string | number)[];
  const summary = validValues.map((entry) => optionLabel(options, entry));
  const label = multiple
    ? summary.length
      ? `${summary.length} selected`
      : placeholder
    : summary[0] || placeholder;

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.pickerButton}>
        <Txt
          variant="body"
          numberOfLines={1}
          style={{
            flex: 1,
            color: summary.length ? colors.text : colors.textFaint,
          }}
        >
          {label}
        </Txt>
        <Ionicons name="chevron-down" size={18} color={colors.textFaint} />
      </Pressable>
      {multiple && validValues.length > 0 ? (
        <View style={styles.fieldChipsWrap}>
          {validValues.map((entry) => {
            const itemLabel = optionLabel(options, entry);
            return (
              <View key={String(entry)} style={styles.chip}>
                <Txt variant="faint" numberOfLines={1} style={styles.chipText}>
                  {itemLabel}
                </Txt>
                <Pressable
                  hitSlop={6}
                  onPress={() => {
                    const next = validValues.filter((v) => v !== entry);
                    onChange(next);
                  }}
                  style={styles.chipRemove}
                  accessibilityLabel={`Remove ${itemLabel}`}
                >
                  <Ionicons name="close" size={13} color={colors.textMuted} />
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}
      <PickerModal
        visible={open}
        title={title}
        options={options}
        value={value}
        multiple={multiple}
        clearable={clearable}
        freeSolo={freeSolo}
        onChange={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  pickerButton: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 11,
    backgroundColor: colors.surfaceAlt,
  },
  pickerSheet: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  keyboardAvoid: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: 11,
    fontSize: font.size.base,
  },
  customChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.sm,
    padding: spacing.md,
    backgroundColor: colors.primarySoft,
  },
  modalChipsContainer: {
    maxHeight: 40,
  },
  modalChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  fieldChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.pill,
    paddingLeft: spacing.sm,
    paddingRight: 6,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: font.size.xs,
    color: colors.text,
    maxWidth: 220,
  },
  chipRemove: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  trashBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerList: {
    paddingBottom: spacing.xxl,
  },
  pickerRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  emptyPicker: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  pickerActions: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
});
