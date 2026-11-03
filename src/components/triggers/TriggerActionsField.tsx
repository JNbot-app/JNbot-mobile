import React, { useEffect, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  newTriggerAction,
  TRIGGER_ACTION_ICONS,
  TRIGGER_ACTION_TYPES,
  type TriggerAction,
  type TriggerActionType,
} from "../../features/triggers";
import type { JNbotClient } from "../../client/JNbotClient";
import { Choice, PickerField } from "../PickerField";
import { IconButton, Txt } from "../ui";
import { colors, radii, spacing } from "../../theme/theme";
import { triggerInputStyle } from "./triggerInputStyle";

const ACTION_CHOICES: Choice[] = (Object.keys(TRIGGER_ACTION_TYPES) as TriggerActionType[]).map((type) => ({
  label: TRIGGER_ACTION_TYPES[type].name,
  value: type,
  description: TRIGGER_ACTION_TYPES[type].description,
}));

/** Script actions use the plugin id, the same value desktop stores. */
function useScriptActionChoices(client: JNbotClient | null, enabled: boolean) {
  const [choices, setChoices] = useState<Choice[]>([]);
  useEffect(() => {
    if (!client || !enabled || choices.length) return;
    void client
      .profileAction<{ name: string; pluginId: string; description?: string }[]>("GET_SCRIPT_ACTIONS")
      .then((actions) => setChoices((Array.isArray(actions) ? actions : []).map((a) => ({ label: a.name, value: a.pluginId, description: a.description }))))
      .catch(() => undefined);
  }, [client, enabled, choices.length]);
  return choices;
}

function ActionInput({ action, scriptActions, onChange }: {
  action: TriggerAction;
  scriptActions: Choice[];
  onChange: (action: TriggerAction) => void;
}) {
  const input = (value: string, placeholder: string, set: (value: string) => void, url?: boolean) => (
    <TextInput
      value={value}
      onChangeText={set}
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType={url ? "url" : "default"}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      style={triggerInputStyle}
    />
  );
  switch (action.type) {
    case "discord":
      return input(action.webhook, "https://discord.com/api/webhooks/…", (webhook) => onChange({ ...action, webhook }), true);
    case "chat":
      return input(action.message, "Message or /command", (message) => onChange({ ...action, message }));
    case "log":
      return input(action.directory, "Directory on the JNbot host", (directory) => onChange({ ...action, directory }));
    case "scriptAction":
      return (
        <PickerField
          title="Script action"
          options={scriptActions}
          value={action.id}
          placeholder="Choose a script action"
          onChange={(id) => onChange({ ...action, id: String(id ?? "") })}
        />
      );
    default:
      return null;
  }
}

type Props = {
  actions: TriggerAction[];
  vars: readonly string[];
  client: JNbotClient | null;
  onChange: (actions: TriggerAction[]) => void;
};

export function TriggerActionsField({ actions, vars, client, onChange }: Props) {
  const scriptActions = useScriptActionChoices(client, actions.some((a) => a.type === "scriptAction"));
  return (
    <>
      {actions.map((action, index) => (
        <View key={index} style={styles.action}>
          <View style={styles.actionHeader}>
            <Ionicons name={TRIGGER_ACTION_ICONS[action.type]} size={18} color={colors.primary} />
            <Txt style={{ flex: 1 }}>{TRIGGER_ACTION_TYPES[action.type].name}</Txt>
            <IconButton
              size={34}
              bg="transparent"
              accessibilityLabel={`Remove ${TRIGGER_ACTION_TYPES[action.type].name}`}
              onPress={() => onChange(actions.filter((_, i) => i !== index))}
            >
              <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
            </IconButton>
          </View>
          <ActionInput
            action={action}
            scriptActions={scriptActions}
            onChange={(next) => onChange(actions.map((current, i) => (i === index ? next : current)))}
          />
        </View>
      ))}
      <PickerField
        title="Add action"
        options={ACTION_CHOICES}
        value={undefined}
        placeholder="Add action"
        onChange={(type) => type && onChange([...actions, newTriggerAction(type as TriggerActionType)])}
      />
      {actions.some((action) => action.type === "chat") ? (
        <Txt variant="faint">Placeholders: {["bot", ...vars].map((v) => `{${v}}`).join(" ")}</Txt>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  action: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.borderSubtle },
  actionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
