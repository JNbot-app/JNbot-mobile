import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import textures from "../../generated/inventory-textures.json";
import { RichText } from "../RichText";
import { Txt } from "../ui";
import { font, spacing } from "../../theme/theme";
import type { ChatClick, ChatPart } from "../../features/chat";
import type { DialogInput, DialogValue, ScreenPrompt } from "../../features/inventory";
import { ChatMessage } from "./ChatMessage";
import { DialogInputField } from "./DialogInputField";
import { McButton } from "./McButton";

type Props = {
  dialog: Extract<ScreenPrompt, { kind: "dialog" }>;
  onClick: (click: ChatClick) => void;
  onButton: (button: number, values: Record<string, DialogValue>) => void;
};

const textureMap = textures as Record<string, string>;

const initialValues = (inputs: DialogInput[]): Record<string, DialogValue> =>
  Object.fromEntries(
    inputs.map((input) => [input.key, input.type === "single_option" ? input.options[input.initial]?.id ?? "" : input.initial]),
  );

/** Server dialog (1.21.6+): notice, confirmation, multi action, dialog list. */
export function DialogView({ dialog, onClick, onButton }: Props) {
  const [values, setValues] = useState(() => initialValues(dialog.inputs));
  const onPress = ({ click }: ChatPart) => click && onClick(click);
  const columns = Math.max(1, Math.min(dialog.columns, dialog.buttons.length, 2)); // narrow screens: max 2

  return (
    <View style={styles.root}>
      <RichText style={styles.title}>{dialog.title}</RichText>
      {dialog.body.map((body, i) => (
        <View key={i} style={styles.body}>
          {body.item ? (
            <View>
              <Image source={textureMap[body.item.name] ? { uri: textureMap[body.item.name] } : undefined} style={styles.item} contentFit="contain" />
              {body.item.count > 1 ? <Txt style={styles.count}>{body.item.count}</Txt> : null}
            </View>
          ) : null}
          {body.text ? <ChatMessage line={body.text} style={styles.text} onPress={onPress} /> : null}
        </View>
      ))}
      {dialog.inputs.map((input) => (
        <View key={input.key} style={styles.control}>
          <DialogInputField
            input={input}
            value={values[input.key]}
            onChange={(value) => setValues((prev) => ({ ...prev, [input.key]: value }))}
          />
        </View>
      ))}
      <View style={styles.buttons}>
        {dialog.buttons.map((button, i) => (
          <View key={i} style={{ width: `${100 / columns}%`, padding: 4 }}>
            <McButton
              label={button.label}
              onPress={() => {
                if (button.click) onClick(button.click);
                onButton(i, values);
              }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", gap: spacing.md, padding: spacing.md, backgroundColor: "rgba(16,16,16,0.95)", borderWidth: 2, borderColor: "#555" },
  title: { color: "#fff", fontSize: 17, fontWeight: "700", textAlign: "center" },
  body: { flexDirection: "row", alignItems: "center", gap: spacing.sm, maxWidth: "100%" },
  text: { color: "#fff", fontSize: font.size.sm, lineHeight: 21, textAlign: "center", flexShrink: 1 },
  item: { width: 32, height: 32 },
  count: { position: "absolute", right: -2, bottom: -6, color: "#fff", fontWeight: "900", textShadowColor: "#3f3f3f", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 0 },
  control: { width: "100%", maxWidth: 320 },
  buttons: { width: "100%", flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
});
