import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Button, Txt } from "../ui";
import { spacing } from "../../theme/theme";
import type { JNbotClient } from "../../client/JNbotClient";
import type { ActiveBot } from "../../store/types";

type MouseButton = "left" | "right";
type MouseState = Record<MouseButton, boolean>;

const BUTTONS: { button: MouseButton; label: string }[] = [
  { button: "left", label: "Left click" },
  { button: "right", label: "Right click" },
];

export function MouseControls({ bot, client, disabled }: { bot: ActiveBot; client: JNbotClient; disabled: boolean }) {
  const [held, setHeld] = useState<MouseState>({ left: false, right: false });

  const mouse = async (data?: { button: MouseButton; mode: string }) => {
    const state = await client.botAction<MouseState>(bot, "mouse", data ? [data] : [], true).catch(() => undefined);
    if (state) setHeld(state);
  };

  useEffect(() => {
    void mouse();
  }, [bot.botId, bot.MESSAGE_ADDRESS]);

  return (
    <View style={{ gap: spacing.sm }}>
      {BUTTONS.map(({ button, label }) => (
        <View key={button} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Txt style={{ flex: 1 }}>{label}</Txt>
          <Button title="Click" small variant="secondary" disabled={disabled} onPress={() => void mouse({ button, mode: "click" })} />
          <Button
            title={held[button] ? "Release" : "Hold"}
            small
            variant={held[button] ? "primary" : "secondary"}
            disabled={disabled}
            onPress={() => void mouse({ button, mode: held[button] ? "release" : "press" })}
          />
        </View>
      ))}
    </View>
  );
}
