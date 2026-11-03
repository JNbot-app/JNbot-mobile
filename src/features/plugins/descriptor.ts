import type { PluginRunDescriptor, SerializableOption } from '../../runtime/types';
import type { MacroInfo } from '../../store/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

const choiceOptionTypes = new Set([
  'select',
  'multiSelect',
  'gamemodeSelect',
  'altSelect',
  'altsSelect',
  'tagsSelect',
  'altRange',
]);

function normalizeChoices(value: unknown): NonNullable<SerializableOption['options']> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((choice) => {
    if (typeof choice === 'string' || typeof choice === 'number') {
      return [{ label: String(choice), value: choice }];
    }
    if (!isRecord(choice) || typeof choice.label !== 'string') return [];
    if (typeof choice.value !== 'string' && typeof choice.value !== 'number') return [];
    return [{ label: choice.label, value: choice.value }];
  });
}

function normalizeOption(value: unknown): SerializableOption | undefined {
  if (!isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.label !== 'string' ||
    typeof value.type !== 'string') return undefined;

  return {
    ...value,
    id: value.id,
    label: value.label,
    type: value.type,
    ...(choiceOptionTypes.has(value.type) ? { options: normalizeChoices(value.options) } : {}),
  };
}

/** Validate legacy/runtime-owned descriptor data once before UI code consumes it. */
export function normalizePluginRunDescriptor(
  value: unknown,
  fallbackInfo: MacroInfo,
): PluginRunDescriptor {
  const descriptor = isRecord(value) ? value : {};
  const rawInfo = isRecord(descriptor.info) ? descriptor.info : {};
  const info: MacroInfo = {
    ...fallbackInfo,
    ...rawInfo,
    pluginId: stringOr(rawInfo.pluginId, fallbackInfo.pluginId),
    name: stringOr(rawInfo.name, fallbackInfo.name),
    description: typeof rawInfo.description === 'string'
      ? rawInfo.description
      : fallbackInfo.description,
    editedAt: typeof rawInfo.editedAt === 'number' || rawInfo.editedAt === null
      ? rawInfo.editedAt
      : fallbackInfo.editedAt,
    createdAt: typeof rawInfo.createdAt === 'number'
      ? rawInfo.createdAt
      : fallbackInfo.createdAt,
    public: typeof rawInfo.public === 'boolean' ? rawInfo.public : fallbackInfo.public,
    scriptType: rawInfo.scriptType === 'script' ||
      rawInfo.scriptType === 'action' ||
      rawInfo.scriptType === 'profileUi' ||
      rawInfo.scriptType === 'botExtension'
      ? rawInfo.scriptType
      : fallbackInfo.scriptType,
  };

  const rawSections = Array.isArray(descriptor.sections) ? descriptor.sections : [];
  const sections = rawSections.flatMap((section, index) => {
    if (!isRecord(section)) return [];
    const options = Array.isArray(section.options)
      ? section.options.flatMap((option) => {
        const normalized = normalizeOption(option);
        return normalized ? [normalized] : [];
      })
      : [];
    return [{
      id: stringOr(section.id, `section-${index}`),
      name: stringOr(section.name, 'General'),
      description: typeof section.description === 'string' ? section.description : undefined,
      collapsed: Boolean(section.collapsed),
      options,
    }];
  });

  const valid = isRecord(value);
  return {
    info,
    source: descriptor.source === 'profile' ? 'profile' : 'installed',
    allowed: valid && descriptor.allowed !== false,
    blockedReason: typeof descriptor.blockedReason === 'string'
      ? descriptor.blockedReason
      : valid
        ? undefined
        : 'This script returned invalid configuration data.',
    sections,
    values: isRecord(descriptor.values) ? descriptor.values : {},
  };
}
