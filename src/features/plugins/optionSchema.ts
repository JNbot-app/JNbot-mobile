import type { SerializableOption } from "../../runtime/types";

/** A plugin's `config`: named sections of options, as the desktop's SettingsBuilder writes it. */
export type OptionSection = { name: string; collapsed?: boolean; options: SerializableOption[] };

/** Same labels and order as the desktop builder. `list` columns are edited on the desktop. */
export const OPTION_TYPES = [
  { value: "input", label: "Text input", description: "Free-form text, number, or password." },
  { value: "select", label: "Single select", description: "Pick one of a list of choices." },
  { value: "multiSelect", label: "Multi select", description: "Pick any number of choices." },
  { value: "slider", label: "Slider", description: "A number between a min and max." },
  { value: "switch", label: "Switch", description: "On or off." },
  { value: "coordinate", label: "Coordinate", description: "A Minecraft X / Y / Z position." },
  { value: "keybind", label: "Keybind", description: "A key or key combination." },
  { value: "list", label: "List", description: "Repeatable rows of fields." },
  { value: "altSelect", label: "Alt select", description: "Pick one alt account." },
  { value: "altsSelect", label: "Alts select", description: "Pick several alt accounts." },
  { value: "altRange", label: "Alt range", description: "A slice of the alt list." },
  { value: "tagsSelect", label: "Alt tags select", description: "Pick one or more alt tags." },
  { value: "gamemodeSelect", label: "Gamemode select", description: "Pick a gamemode of the server." },
  { value: "activeBotSelect", label: "Active bot select", description: "Pick an online bot or client." },
  { value: "scriptSelect", label: "Script select", description: "Pick scripts, actions or chains." },
] as const;

export const optionTypeLabel = (type: string) => OPTION_TYPES.find((item) => item.value === type)?.label ?? type;

/** Types whose value can be a list instead of one item. */
export const MULTIPLE_TYPES = ["gamemodeSelect", "activeBotSelect", "scriptSelect"];

/** Keys that only mean something for one type; dropped when the type changes, like the desktop. */
const TYPE_FIELDS = [
  "inputType", "placeholder", "defaultValue", "options", "clearable", "freeSolo", "min", "max", "step", "marks",
  "labelChecked", "labelUnchecked", "multiple", "botFilter", "filter", "kinds", "fields", "minItems", "maxItems",
  "addLabel", "withDimension", "simple", "gamemodes",
] as const;

const ID_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** "Max mining speed" → "maxMiningSpeed", as the desktop suggests ids. */
export function slugify(label: string): string {
  const parts = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  const camel = parts.map((part, index) => (index ? part[0].toUpperCase() + part.slice(1) : part)).join("");
  return /^[0-9]/.test(camel) ? `_${camel}` : camel;
}

export function withType(option: SerializableOption, type: string): SerializableOption {
  if (option.type === type) return option;
  const next: Record<string, unknown> = { ...option, type };
  for (const key of TYPE_FIELDS) delete next[key];
  if (type === "slider") Object.assign(next, { min: 0, max: 100, step: 1 });
  return next as SerializableOption;
}

/** Returns the first problem, or null when the option can be saved. */
export function validateOption(option: SerializableOption, takenIds: string[]): string | null {
  if (!option.label.trim()) return "Give the option a label.";
  if (!ID_PATTERN.test(option.id)) return "The ID must start with a letter and use only letters, numbers and _.";
  if (takenIds.includes(option.id)) return `Another option already uses the ID “${option.id}”.`;
  if ((option.type === "select" || option.type === "multiSelect") && !option.options?.length)
    return "Add at least one choice.";
  if (option.type === "slider") {
    const { min = 0, max = 0, step = 0 } = option;
    if (!(min < max)) return "Min must be lower than max.";
    if (!(step > 0)) return "Step must be greater than 0.";
  }
  return null;
}

/** Choices are edited as one label per line; existing values are kept for unchanged labels. */
export function choicesFromText(text: string, previous: SerializableOption["options"] = []) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((label) => previous.find((choice) => choice.label === label) ?? { label, value: label });
}

/** Drops empty optional fields so saved configs stay as lean as the desktop's. */
export function cleanOption(option: SerializableOption): SerializableOption {
  const next: Record<string, unknown> = { ...option, id: option.id.trim(), label: option.label.trim() };
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined || value === "" || value === false || (Array.isArray(value) && !value.length)) delete next[key];
  }
  return next as SerializableOption;
}
