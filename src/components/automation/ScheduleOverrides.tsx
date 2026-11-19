import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { PluginOptionInput } from "../PluginOptions";
import PresetPicker from "./PresetPicker";
import { Button, Txt } from "../ui";
import { useClient } from "../../net/ConnectionProvider";
import { useStore } from "../../store/store";
import type { PluginRunDescriptor } from "../../runtime/types";
import {
  overrideValue,
  setOverride,
} from "../../generated/client-contract/cooldowns";
import {
  presetValues,
  PRESET_OPTION,
  selectedPresetId,
  withPreset,
} from "../../generated/client-contract/pluginPresets";
import type { RunnableScript } from "../../hooks/useRunnableScripts";

export default function ScheduleOverrides({
  script,
  values,
  onChange,
  label = "Script overrides",
  hint = "Unchanged options use the script’s saved settings when it runs.",
}: {
  script: RunnableScript;
  values: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  label?: string;
  hint?: string;
}) {
  const client = useClient();
  const [open, setOpen] = useState(false);
  const [descriptor, setDescriptor] = useState<PluginRunDescriptor>();
  const [error, setError] = useState<string>();
  const stored = useStore(
    (state) => state.settings.scripts?.[script.info.pluginId],
  );
  const presetId = selectedPresetId(stored, values);
  const saved = useMemo(() => presetValues(stored, presetId), [stored, presetId]);
  const alts = useStore((state) => state.settings.altData);
  const tags = useStore((state) => state.settings.altTags);
  useEffect(() => {
    if (!open || !client) return;
    let cancelled = false;
    const request = script.profileScriptId
      ? client.getProfileScriptDescriptor({
          id: script.profileScriptId,
          fallback: script.info,
        })
      : client.getPluginDescriptor(script.info);
    void request
      .then((result) => {
        if (!cancelled) setDescriptor(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load script options.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [open, client, script]);
  const fields =
    descriptor?.sections.flatMap((section) => section.options) ?? [];
  return (
    <View style={{ gap: 12 }}>
      <PresetPicker
        pluginId={script.info.pluginId}
        value={values[PRESET_OPTION] as string | undefined}
        onChange={(preset) => onChange(withPreset(values, preset))}
      />
      <Button
        title={open ? `Hide ${label.toLowerCase()}` : label}
        variant="secondary"
        onPress={() => setOpen(!open)}
      />
      {open && (
        <>
          <Txt variant="muted">{hint}</Txt>
          {error ? (
            <Txt variant="muted">{error}</Txt>
          ) : !descriptor ? (
            <ActivityIndicator />
          ) : !fields.length ? (
            <Txt variant="muted">No configurable options.</Txt>
          ) : (
            fields.map((option) => (
              <View key={option.id} style={{ gap: 4 }}>
                <PluginOptionInput
                  option={option}
                  value={overrideValue(option, fields, saved, values)}
                  altOptions={Object.keys(alts ?? {}).map((value) => ({
                    label: value,
                    value,
                  }))}
                  tagOptions={(tags ?? []).map((tag) => ({
                    label: tag.name,
                    value: tag.id,
                  }))}
                  onChange={(value) =>
                    onChange(setOverride(option, value, fields, saved, values))
                  }
                />
                {Object.prototype.hasOwnProperty.call(values, option.id) && (
                  <Button
                    title="Use saved setting"
                    small
                    variant="ghost"
                    onPress={() => {
                      const next = { ...values };
                      delete next[option.id];
                      onChange(next);
                    }}
                  />
                )}
              </View>
            ))
          )}
        </>
      )}
    </View>
  );
}
