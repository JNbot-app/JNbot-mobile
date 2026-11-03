import type { SerializableOption } from '../../runtime/types';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export function dependencyKey(
  option: SerializableOption,
  options: SerializableOption[],
  values: Record<string, unknown>,
) {
  if (!option.valueByFieldId) return undefined;
  const parent = options.find((item) => item.id === option.valueByFieldId);
  const selected = parent ? values[parent.id] ?? parent.defaultValue : undefined;
  return selected === undefined || selected === null || selected === ''
    ? undefined
    : String(selected).toLowerCase();
}

export function resolveOptionValue(
  option: SerializableOption,
  options: SerializableOption[],
  values: Record<string, unknown>,
) {
  const stored = values[option.id];
  const key = dependencyKey(option, options, values);
  if (key && isRecord(stored))
    return stored[key] !== undefined ? stored[key] : option.defaultValue;
  return stored !== undefined ? stored : option.defaultValue;
}
