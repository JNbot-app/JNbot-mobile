import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { JNbotClient } from "../../client/JNbotClient";
import type { ActiveBot, SettingsObj } from "../../store/types";
import { triggerAppliesTo, type Trigger } from "../../features/triggers";
import { TriggerRow } from "../triggers/TriggerRow";
import { useTriggerEditor } from "../triggers/useTriggerEditor";
import { Button, Card, Divider, IconButton, Txt } from "../ui";
import { colors, spacing } from "../../theme/theme";

type Props = {
  bot: ActiveBot;
  client: JNbotClient;
  settings: SettingsObj;
};

const EMPTY: Trigger[] = [];

const lastRunLabel = (timestamp?: number) => {
  if (!timestamp) return "Not run yet";
  const minutes = Math.round((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return "Ran just now";
  return minutes < 60 ? `Ran ${minutes}m ago` : `Ran ${Math.round(minutes / 60)}h ago`;
};

/** Triggers that apply to this bot, with their last run and a test button. */
export function BotTriggers({ bot, client, settings }: Props) {
  const editor = useTriggerEditor();
  const [lastFired, setLastFired] = useState<Record<string, number>>({});
  const applicable = (settings.triggers ?? EMPTY).filter((trigger) =>
    triggerAppliesTo(trigger, bot.username, settings.altTags),
  );

  useEffect(() => {
    setLastFired({});
    const unsubscribe = client.subscribeBot(bot, "triggers", (data) =>
      setLastFired({ ...((data && typeof data === "object" ? data : {}) as Record<string, number>) }),
    );
    void client.botAction(bot, "triggersPacket", [], true).catch(() => undefined);
    return unsubscribe;
  }, [bot.botId, bot.MESSAGE_ADDRESS, client]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Txt variant="heading">Triggers</Txt>
          <Txt variant="muted">Rules that run on {bot.username}. All triggers are in Automation.</Txt>
        </View>
        <Button title="Add" small onPress={() => editor.open(undefined, { alts: [bot.username] })} />
      </View>
      <Card style={styles.list}>
        {applicable.length ? (
          applicable.map((trigger, index) => (
            <React.Fragment key={trigger.id}>
              {index ? <Divider /> : null}
              <TriggerRow
                trigger={trigger}
                detail={lastRunLabel(lastFired[trigger.id])}
                disabled={editor.busy}
                onPress={(t) => editor.open(t)}
                onToggle={editor.toggle}
                extra={
                  <IconButton
                    size={36}
                    bg="transparent"
                    accessibilityLabel="Test trigger"
                    onPress={() => void client.botAction(bot, "testTrigger", [trigger.id]).catch(() => undefined)}
                  >
                    <Ionicons name="flask-outline" size={19} color={colors.textMuted} />
                  </IconButton>
                }
              />
            </React.Fragment>
          ))
        ) : (
          <Txt variant="muted" style={styles.empty}>No triggers apply to this bot.</Txt>
        )}
      </Card>
      {editor.editor}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  list: { padding: 0, overflow: "hidden" },
  empty: { padding: spacing.lg, textAlign: "center" },
});
