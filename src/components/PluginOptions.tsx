import React from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Txt } from './ui';
import { PickerField, type Choice } from './PickerField';
import type { SerializableOption } from '../runtime/types';
import { useRunnableScripts } from '../hooks/useRunnableScripts';
import { groupScriptsByKind } from '../generated/client-contract/scriptKinds';
import { colors, font, radii, spacing } from '../theme/theme';

export { PickerField, type Choice };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

function FieldCard({ option, children }: { option: SerializableOption; children: React.ReactNode }) {
  const switchStateDescription = option.type === 'switch' && (option.labelChecked || option.labelUnchecked)
    ? `Enabled: ${option.labelChecked ?? 'On'} · Disabled: ${option.labelUnchecked ?? 'Off'}`
    : null;

  return <View style={styles.option}>
    <View style={styles.optionTitle}><Txt variant="body" style={{ flex: 1 }}>{option.label}</Txt>{option.required ? <Txt variant="faint" style={{ color: colors.warning }}>Required</Txt> : null}</View>
    {option.tooltip ? <Txt variant="faint">{option.tooltip}</Txt> : null}
    {switchStateDescription ? <Txt variant="faint">{switchStateDescription}</Txt> : null}
    {children}
  </View>;
}

function NumberEditor({ value, min, max, step = 1, onChange }: { value: unknown; min?: number; max?: number; step?: number; onChange: (value: number) => void }) {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : min ?? 0;
  const update = (next: number) => onChange(Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, next)));
  return <View style={styles.numberEditor}>
    <Pressable onPress={() => update(numeric - step)} style={styles.stepButton}><Ionicons name="remove" size={20} color={colors.text} /></Pressable>
    <TextInput value={String(numeric)} onChangeText={(text) => { const next = Number(text); if (text !== '' && Number.isFinite(next)) update(next); }} keyboardType="numeric" selectTextOnFocus style={styles.numberInput} />
    <Pressable onPress={() => update(numeric + step)} style={styles.stepButton}><Ionicons name="add" size={20} color={colors.text} /></Pressable>
  </View>;
}

function RangeEditor({ option, value, altOptions, onChange }: { option: SerializableOption; value: unknown; altOptions: Choice[]; onChange: (value: [string | null, string | null]) => void }) {
  const range = Array.isArray(value) ? value : [];
  const start = typeof range[0] === 'string' ? range[0] : null;
  const end = typeof range[1] === 'string' ? range[1] : null;
  const all = altOptions.length ? altOptions : (option.options ?? []);
  const startIndex = all.findIndex((item) => item.value === start);
  const endIndex = all.findIndex((item) => item.value === end);
  const starts = endIndex < 0 ? all : all.slice(0, endIndex + 1);
  const ends = startIndex < 0 ? all : all.slice(startIndex);
  return <FieldCard option={option}>
    <View style={styles.rangeRow}>
      <View style={{ flex: 1, gap: spacing.xs }}><Txt variant="faint">Start with</Txt><PickerField title={`Start with · ${option.label}`} options={starts} value={start} clearable placeholder="First alt (default)" onChange={(next) => onChange([typeof next === 'string' ? next : null, end])} /></View>
      <Ionicons name="arrow-forward" size={18} color={colors.primary} style={{ marginTop: 34 }} />
      <View style={{ flex: 1, gap: spacing.xs }}><Txt variant="faint">End with</Txt><PickerField title={`End with · ${option.label}`} options={ends} value={end} clearable placeholder="Last alt (default)" onChange={(next) => onChange([start, typeof next === 'string' ? next : null])} /></View>
    </View>
  </FieldCard>;
}

function CoordinateEditor({ option, value, onChange }: { option: SerializableOption; value: unknown; onChange: (value: unknown) => void }) {
  const coordinate = isRecord(value) ? value : {};
  const update = (key: string, input: string) => {
    const number = Number(input);
    onChange({ ...coordinate, [key]: input === '' || !Number.isFinite(number) ? undefined : number });
  };
  return <FieldCard option={option}>
    <View style={styles.coordinateRow}>{(['x', 'y', 'z'] as const).map((key) => <View key={key} style={styles.coordinateInput}><Txt variant="faint" style={{ textTransform: 'uppercase' }}>{key}</Txt><TextInput value={coordinate[key] === undefined ? '' : String(coordinate[key])} onChangeText={(text) => update(key, text)} keyboardType="numeric" placeholder="—" placeholderTextColor={colors.textFaint} style={[styles.textInput, { flex: 1, borderWidth: 0, paddingVertical: 0 }]} /></View>)}</View>
    {option.withDimension ? <PickerField title={`Dimension · ${option.label}`} options={[{ label: 'Overworld', value: 'overworld' }, { label: 'Nether', value: 'nether' }, { label: 'End', value: 'end' }]} value={coordinate.dim ?? coordinate.dimension} clearable placeholder="Dimension (optional)" onChange={(dimension) => onChange({ ...coordinate, dim: dimension })} /> : null}
  </FieldCard>;
}

function ListEditor({ option, value, altOptions, tagOptions, onChange }: { option: SerializableOption; value: unknown; altOptions: Choice[]; tagOptions?: Choice[]; onChange: (value: Record<string, unknown>[]) => void }) {
  const rows = Array.isArray(value) ? value.filter(isRecord) : [];
  const fields = option.fields ?? [];
  const minItems = option.minItems ?? 0;
  const maxItems = option.maxItems ?? Number.POSITIVE_INFINITY;
  const updateRow = (index: number, key: string, next: unknown) => onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: next } : row));
  const add = () => {
    if (rows.length >= maxItems) return;
    onChange([...rows, Object.fromEntries(fields.map((field) => [field.key, field.defaultValue]))]);
  };
  return <FieldCard option={option}>
    {rows.map((row, rowIndex) => <View key={rowIndex} style={styles.listRow}>
      <View style={styles.listRowHeader}><Txt variant="muted">Item {rowIndex + 1}</Txt>{rows.length > minItems ? <Pressable hitSlop={8} onPress={() => onChange(rows.filter((_, index) => index !== rowIndex))}><Ionicons name="trash-outline" size={19} color={colors.danger} /></Pressable> : null}</View>
      {fields.map((field) => <ListFieldEditor key={field.key} field={field} value={row[field.key]} altOptions={altOptions} tagOptions={tagOptions} onChange={(next) => updateRow(rowIndex, field.key, next)} />)}
    </View>)}
    <Button title={option.addLabel || 'Add row'} variant="secondary" full disabled={rows.length >= maxItems} icon={<Ionicons name="add" size={18} color={colors.text} />} onPress={add} />
  </FieldCard>;
}

function ListFieldEditor({ field, value, altOptions, tagOptions, onChange }: { field: NonNullable<SerializableOption['fields']>[number]; value: unknown; altOptions: Choice[]; tagOptions?: Choice[]; onChange: (value: unknown) => void }) {
  if (field.type === 'switch') return <View style={styles.listField}><Txt variant="muted" style={{ flex: 1 }}>{field.label}</Txt><Switch value={Boolean(value)} onValueChange={onChange} trackColor={{ true: colors.primary }} /></View>;
  if (field.type === 'slider') return <View style={styles.listField}><Txt variant="muted">{field.label}</Txt><NumberEditor value={value ?? field.defaultValue} min={field.min} max={field.max} step={field.step} onChange={onChange} /></View>;
  if (field.type === 'select' || field.type === 'altSelect' || field.type === 'altsSelect' || field.type === 'tagsSelect') {
    const multiple = field.type === 'altsSelect' || field.type === 'tagsSelect';
    const choices = field.type === 'altSelect' || field.type === 'altsSelect'
      ? (altOptions.length ? altOptions : (field.options ?? []))
      : field.type === 'tagsSelect'
        ? ((tagOptions && tagOptions.length) ? tagOptions : (field.options ?? []))
        : (field.options ?? []);
    return <View style={styles.listField}><Txt variant="muted">{field.label}</Txt><PickerField title={field.label} options={choices} value={value} multiple={multiple} clearable placeholder={field.placeholder || 'Choose an option'} onChange={onChange} /></View>;
  }
  return <View style={styles.listField}><Txt variant="muted">{field.label}</Txt><TextInput value={value === undefined || value === null ? '' : String(value)} onChangeText={(text) => onChange(field.inputType === 'number' ? (text === '' ? undefined : Number(text)) : text)} placeholder={field.placeholder} placeholderTextColor={colors.textFaint} secureTextEntry={field.inputType === 'password'} keyboardType={field.inputType === 'number' ? 'numeric' : 'default'} style={styles.textInput} /></View>;
}

function ScriptSelectEditor({ option, value, onChange }: { option: SerializableOption; value: unknown; onChange: (value: unknown) => void }) {
  const { scripts, loading } = useRunnableScripts();
  const choices = groupScriptsByKind(scripts, option.kinds).flatMap((group) =>
    group.scripts.map(({ info }) => ({ label: info.name, value: info.pluginId, description: group.label })));
  return <FieldCard option={option}><PickerField title={option.label} options={choices} value={value} multiple={option.multiple === true} clearable={option.clearable !== false} placeholder={loading ? 'Loading scripts...' : 'Choose a script'} onChange={onChange} /></FieldCard>;
}

export function PluginOptionInput({ option, value, altOptions, tagOptions, onChange }: { option: SerializableOption; value: unknown; altOptions: Choice[]; tagOptions?: Choice[]; onChange: (value: unknown) => void }) {
  if (option.supported === false) return <FieldCard option={option}><Txt variant="faint">{option.unsupportedReason ?? 'This option is unavailable on mobile.'}</Txt></FieldCard>;
  if (option.type === 'switch') return <FieldCard option={option}><View style={styles.switchRow}><Switch value={Boolean(value)} onValueChange={onChange} trackColor={{ true: colors.primary }} /></View></FieldCard>;
  if (option.type === 'altRange') return <RangeEditor option={option} value={value} altOptions={altOptions} onChange={onChange} />;
  if (option.type === 'coordinate') return <CoordinateEditor option={option} value={value} onChange={onChange} />;
  if (option.type === 'list') return <ListEditor option={option} value={value} altOptions={altOptions} tagOptions={tagOptions} onChange={onChange} />;
  if (option.type === 'scriptSelect') return <ScriptSelectEditor option={option} value={value} onChange={onChange} />;
  if (option.type === 'slider') return <FieldCard option={option}><NumberEditor value={value} min={option.min} max={option.max} step={option.step} onChange={onChange} /></FieldCard>;
  if (option.type === 'select' || option.type === 'altSelect' || option.type === 'gamemodeSelect' || option.type === 'multiSelect' || option.type === 'altsSelect' || option.type === 'tagsSelect') {
    const multiple = option.type === 'multiSelect' || option.type === 'altsSelect' || option.type === 'tagsSelect' || (option.type === 'gamemodeSelect' && option.multiple);
    const choices = option.type === 'altSelect' || option.type === 'altsSelect'
      ? (altOptions.length ? altOptions : (option.options ?? []))
      : option.type === 'tagsSelect'
        ? ((tagOptions && tagOptions.length) ? tagOptions : (option.options ?? []))
        : (option.options ?? []);
    return <FieldCard option={option}><PickerField title={option.label} options={choices} value={value} multiple={multiple} clearable={option.clearable} freeSolo={option.freeSolo} placeholder={choices.length ? `Choose ${option.label.toLowerCase()}` : 'No options available'} onChange={onChange} /></FieldCard>;
  }
  return <FieldCard option={option}><TextInput value={value === undefined || value === null ? '' : String(value)} onChangeText={(text) => onChange(option.inputType === 'number' ? (text === '' ? undefined : Number(text)) : text)} placeholder={option.placeholder} placeholderTextColor={colors.textFaint} secureTextEntry={option.inputType === 'password'} keyboardType={option.inputType === 'number' ? 'numeric' : 'default'} style={styles.textInput} /></FieldCard>;
}

const styles = StyleSheet.create({
  option: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface },
  optionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  textInput: { color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, paddingHorizontal: 11, paddingVertical: 10, fontSize: font.size.base },
  numberEditor: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  stepButton: { width: 48, minHeight: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  numberInput: { flex: 1, color: colors.text, textAlign: 'center', paddingVertical: 10, fontSize: font.size.base },
  rangeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  coordinateRow: { flexDirection: 'row', gap: spacing.sm },
  coordinateInput: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, backgroundColor: colors.surfaceAlt },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  listRow: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.sm, backgroundColor: colors.surfaceAlt },
  listRowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listField: { gap: spacing.xs },
});
