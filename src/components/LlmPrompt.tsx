import { useRef, useState, type ReactNode } from "react";
import * as Haptics from "expo-haptics";
import { ActivityIndicator, LayoutAnimation, Pressable, StyleSheet, TextInput, View } from "react-native";
import { colors, font, palette, radii, spacing } from "../theme/theme";
import { useLlm } from "../hooks/useLlm";
import { useLlmRun, type LlmRun } from "../hooks/useLlmRun";
import { LlmActivity } from "./LlmActivity";
import { NativeIcon } from "./NativeIcon";
import { Txt } from "./ui";

/** Something to show under the prompt once a request finishes, e.g. changes to review. */
export type LlmResult = (dismiss: () => void) => ReactNode;

export type LlmPromptProps = {
  placeholder: string;
  /** Accessibility label of the send button. */
  button?: string;
  /** Start as a small link with this label; the field appears on tap, like the desktop's. */
  collapsedLabel?: string;
  /** Float over the screen: a round button that opens the prompt as a card at the bottom. */
  floating?: boolean;
  /** Example requests, shown as one-tap starters while the field is empty. */
  examples?: string[];
  /** Progress label while the reply writes its result. */
  writingLabel?: string;
  /** Runs the request through `run` (which streams progress). */
  onSubmit: (text: string, run: LlmRun["run"]) => Promise<LlmResult | void>;
};

/** Opens or closes the prompt with the system's ease animation and a light tap on iOS. */
const animate = () => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  if (process.env.EXPO_OS === "ios") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

/** "Describe it" field with live progress, like the desktop's. Renders nothing until AI is set up. */
export function LlmPrompt({ placeholder, button = "Generate", collapsedLabel, floating, examples = [], writingLabel, onSubmit }: LlmPromptProps) {
  const { configured } = useLlm();
  const ai = useLlmRun();
  const [text, setText] = useState("");
  const input = useRef<TextInput>(null);
  const [expanded, setOpen] = useState(!collapsedLabel && !floating);
  const setExpanded = (next: boolean) => {
    animate();
    setOpen(next);
  };
  const [result, setResult] = useState<LlmResult>();
  if (!configured) return null;

  if (!expanded && floating) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={collapsedLabel ?? button}
        onPress={() => {
          setExpanded(true);
          setTimeout(() => input.current?.focus());
        }}
        style={({ pressed }) => [styles.fab, styles.lifted, pressed && styles.pressed]}
      >
        <NativeIcon sf="sparkles" material="auto-awesome" size={22} color={colors.primaryOn} />
      </Pressable>
    );
  }

  if (!expanded) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setExpanded(true);
          setTimeout(() => input.current?.focus());
        }}
        style={styles.collapsed}
      >
        <NativeIcon sf="sparkles" material="auto-awesome" size={16} color={colors.primary} />
        <Txt variant="label" style={{ color: colors.primary }}>{collapsedLabel}</Txt>
      </Pressable>
    );
  }

  const dismiss = () => {
    setResult(undefined);
    ai.reset();
  };

  const submit = async () => {
    if (!text.trim() || ai.running) return;
    setResult(undefined);
    let succeeded = false;
    const run: LlmRun["run"] = async (request) => {
      const reply = await ai.run<any>(request);
      succeeded = reply !== undefined;
      return reply;
    };
    const shown = await onSubmit(text.trim(), run);
    // A stopped or failed run keeps the text, so it can be tweaked and sent again.
    if (succeeded) setText("");
    if (shown) setResult(() => shown);
  };

  return (
    <View style={[styles.wrap, floating && [styles.card, styles.lifted]]}>
      {floating ? (
        <View style={styles.cardHeader}>
          <NativeIcon sf="sparkles" material="auto-awesome" size={16} color={colors.primary} />
          <Txt variant="label" style={{ flex: 1 }}>{collapsedLabel ?? button}</Txt>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={() => setExpanded(false)}>
            <NativeIcon sf="xmark.circle.fill" material="cancel" size={22} color={colors.textFaint} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.field}>
        <TextInput
          ref={input}
          accessibilityLabel={placeholder}
          value={text}
          onChangeText={setText}
          onBlur={() => {
            if (collapsedLabel && !floating && !text && !ai.running && !ai.startedAt && !result) setExpanded(false);
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          multiline
          editable={!ai.running}
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={button}
          disabled={!text.trim() || ai.running}
          onPress={submit}
          style={({ pressed }) => [styles.send, !text.trim() && !ai.running && styles.sendOff, pressed && styles.pressed]}
        >
          {ai.running ? (
            <ActivityIndicator size="small" color={colors.primaryOn} />
          ) : (
            <NativeIcon sf="arrow.up" material="arrow-upward" size={16} color={colors.primaryOn} />
          )}
        </Pressable>
      </View>
      {!text && !ai.startedAt && examples.length > 0 ? (
        <View style={styles.examples}>
          {examples.map((example) => (
            <Pressable key={example} accessibilityRole="button" onPress={() => setText(example)} style={styles.example}>
              <Txt variant="faint">{example}</Txt>
            </Pressable>
          ))}
        </View>
      ) : null}
      <LlmActivity run={ai} writingLabel={writingLabel} onDismiss={dismiss} />
      {result?.(dismiss)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  card: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.94 }] },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  lifted: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  collapsed: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start", paddingVertical: spacing.xs },
  field: {
    justifyContent: "center",
    minHeight: 44,
    paddingLeft: spacing.md,
    paddingRight: 44,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderCurve: "continuous",
  },
  input: { color: colors.text, fontSize: font.size.md, maxHeight: 120, paddingVertical: spacing.xs },
  send: {
    position: "absolute",
    right: spacing.xs,
    bottom: spacing.xs,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  sendOff: { opacity: 0.4 },
  examples: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  example: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
  },
});
