import React from "react";
import { View } from "react-native";
import { PickerField } from "../PickerField";
import { Txt } from "../ui";
import { useStore } from "../../store/store";
import {
  DEFAULT_PRESET,
  pluginPresets,
} from "../../generated/client-contract/pluginPresets";

const CURRENT = "";

/**
 * Lets a chain step, schedule, cooldown or trigger pin one of a plugin's
 * presets. Unset follows the plugin's selected preset; renders nothing for
 * plugins without presets.
 */
export default function PresetPicker({
  pluginId,
  value,
  onChange,
}: {
  pluginId: string;
  value?: string;
  onChange: (presetId?: string) => void;
}) {
  const stored = useStore((state) => state.settings.scripts?.[pluginId]);
  const presets = pluginPresets(stored);
  if (!Object.keys(presets).length) return null;

  const missing = value && value !== DEFAULT_PRESET && !presets[value];
  return (
    <View style={{ gap: 4 }}>
      <Txt variant="muted">Preset</Txt>
      <PickerField
        title="Preset"
        value={value ?? CURRENT}
        onChange={(presetId) => onChange(presetId ? String(presetId) : undefined)}
        options={[
          { value: CURRENT, label: "Current preset" },
          { value: DEFAULT_PRESET, label: "Default" },
          ...Object.entries(presets).map(([id, { name }]) => ({
            value: id,
            label: name,
          })),
          ...(missing ? [{ value, label: "Deleted preset (uses Default)" }] : []),
        ]}
      />
    </View>
  );
}
