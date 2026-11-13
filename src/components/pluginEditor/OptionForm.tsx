import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Txt } from '../ui';
import { SettingsGroup } from '../settings/SettingsGroup';
import { SettingsField as Field, SettingsToggle as Toggle } from '../settings/SettingsFields';
import { PickerRow } from '../settings/SettingsPages';
import type { SerializableOption } from '../../runtime/types';
import { MULTIPLE_TYPES, OPTION_TYPES, choicesFromText, slugify, withType } from '../../features/plugins/optionSchema';
import { spacing } from '../../theme/theme';

const INPUT_TYPES = [
  { label: 'Text', value: 'text' },
  { label: 'Number', value: 'number' },
  { label: 'Password', value: 'password' },
];

type Change = (patch: Partial<SerializableOption>) => void;

/** Keeps what is typed (like "-" or "1.") while only passing on real numbers. */
function NumberField({ label, value, onChange }: { label: string; value?: number; onChange: (value: number | undefined) => void }) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  return (
    <View style={styles.half}>
      <Field
        label={label}
        value={text}
        keyboardType="numbers-and-punctuation"
        onChangeText={(next) => {
          setText(next);
          const number = Number(next);
          onChange(next.trim() && Number.isFinite(number) ? number : undefined);
        }}
      />
    </View>
  );
}

function ChoicesField({ option, onChange }: { option: SerializableOption; onChange: Change }) {
  const [previous] = useState(option.options);
  const [text, setText] = useState(() => (option.options ?? []).map((choice) => choice.label).join('\n'));
  return (
    <Field
      label="Choices"
      multiline
      value={text}
      placeholder={'Wheat\nCarrots\nPotatoes'}
      autoCapitalize="none"
      style={styles.choices}
      onChangeText={(next) => {
        setText(next);
        onChange({ options: choicesFromText(next, previous) });
      }}
    />
  );
}

/** The settings that only one option type has, matching the desktop builder's per-type fields. */
function TypeFields({ option, onChange }: { option: SerializableOption; onChange: Change }) {
  switch (option.type) {
    case 'input':
      return (
        <SettingsGroup title="Input">
          <PickerRow label="Kind" title="Input kind" options={INPUT_TYPES} value={option.inputType ?? 'text'} onChange={(value) => onChange({ inputType: value as SerializableOption['inputType'] })} />
          <Field label="Placeholder" value={option.placeholder ?? ''} onChangeText={(placeholder) => onChange({ placeholder })} />
          {option.inputType === 'password' ? null : (
            <Field
              label="Default value"
              value={option.defaultValue === undefined ? '' : String(option.defaultValue)}
              keyboardType={option.inputType === 'number' ? 'numbers-and-punctuation' : 'default'}
              onChangeText={(text) => onChange({ defaultValue: option.inputType === 'number' && text.trim() && Number.isFinite(Number(text)) ? Number(text) : text })}
            />
          )}
        </SettingsGroup>
      );
    case 'select':
    case 'multiSelect':
      return (
        <SettingsGroup title="Choices" footer="One choice per line.">
          <ChoicesField option={option} onChange={onChange} />
          {option.type === 'select' && option.options?.length ? (
            <PickerRow label="Default" title="Default choice" options={option.options} value={option.defaultValue} clearable placeholder="None" onChange={(defaultValue) => onChange({ defaultValue })} />
          ) : null}
        </SettingsGroup>
      );
    case 'slider':
      return (
        <SettingsGroup title="Range">
          <View style={styles.pair}>
            <NumberField label="Min" value={option.min} onChange={(min) => onChange({ min })} />
            <NumberField label="Max" value={option.max} onChange={(max) => onChange({ max })} />
          </View>
          <View style={styles.pair}>
            <NumberField label="Step" value={option.step} onChange={(step) => onChange({ step })} />
            <NumberField label="Default" value={option.defaultValue as number | undefined} onChange={(defaultValue) => onChange({ defaultValue })} />
          </View>
        </SettingsGroup>
      );
    case 'switch':
      return (
        <SettingsGroup>
          <Toggle label="On by default" value={option.defaultValue === true} onChange={(on) => onChange({ defaultValue: on })} />
        </SettingsGroup>
      );
    case 'list':
      return <Txt variant="faint" style={styles.note}>List columns are edited on the desktop.</Txt>;
    default:
      return MULTIPLE_TYPES.includes(option.type) ? (
        <SettingsGroup>
          <Toggle label="Allow several" value={option.multiple === true} onChange={(multiple) => onChange({ multiple })} />
        </SettingsGroup>
      ) : null;
  }
}

/** Edits one option. A new option takes its ID from the label until the ID is edited by hand. */
export function OptionForm({
  option,
  isNew,
  onChange,
  onDelete,
}: {
  option: SerializableOption;
  isNew: boolean;
  onChange: (option: SerializableOption) => void;
  onDelete?: () => void;
}) {
  const [idTouched, setIdTouched] = useState(!isNew);
  const patch: Change = (changes) => onChange({ ...option, ...changes });
  // `list` needs columns, which only the desktop can define.
  const types = OPTION_TYPES.filter((type) => type.value !== 'list' || option.type === 'list');
  return (
    <>
      <SettingsGroup>
        <Field
          label="Label"
          autoFocus={isNew}
          value={option.label}
          placeholder="Mining speed"
          onChangeText={(label) => patch(idTouched ? { label } : { label, id: slugify(label) })}
        />
        <Field
          label="ID"
          value={option.id}
          placeholder="miningSpeed"
          autoCapitalize="none"
          onChangeText={(id) => {
            setIdTouched(true);
            patch({ id });
          }}
        />
        <PickerRow label="Type" title="Option type" options={[...types]} value={option.type} onChange={(type) => onChange(withType(option, String(type)))} />
      </SettingsGroup>
      <TypeFields key={option.type} option={option} onChange={patch} />
      <SettingsGroup>
        <Field label="Help text" multiline value={option.tooltip ?? ''} placeholder="Shown next to the option" onChangeText={(tooltip) => patch({ tooltip })} />
        <Toggle label="Required" value={option.required === true} onChange={(required) => patch({ required })} />
      </SettingsGroup>
      {onDelete ? <Button title="Delete option" variant="danger" full onPress={onDelete} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  choices: { minHeight: 120, textAlignVertical: 'top' },
  note: { paddingHorizontal: spacing.lg },
});
