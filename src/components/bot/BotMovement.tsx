import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Button, Txt } from "../ui";
import { colors, radii, spacing } from "../../theme/theme";
import type { BotMovementPacket } from "../../store/types";
import type { BotAction } from "../../generated/client-contract/mobileClientContract";
import { aimToRotation, movementToAim } from "./botAim";

type Rotation = { yaw: number; pitch: number };
type Control = "forward" | "back" | "left" | "right" | "jump" | "sprint" | "sneak" | "fly";
type Props = {
  connected: boolean;
  movement?: BotMovementPacket;
  onAction: (action: BotAction, data?: unknown[]) => void;
};

const radians = (value: number) => value * Math.PI / 180;
const wrap = (value: number) => ((value % 360) + 360) % 360;
const clamp = (value: number) => Math.max(-90, Math.min(90, value));
const DIAL_SIZE = 220;
const PITCH_HEIGHT = 160;
const compass = ["North", "Northeast", "East", "Southeast", "South", "Southwest", "West", "Northwest"];

function ControlButton({ label, icon, active, disabled, onPress }: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(active), disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        width: 76, minHeight: 62, alignItems: "center", justifyContent: "center", gap: 2,
        borderRadius: radii.md, borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primary : colors.surfaceAlt,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Ionicons name={icon} size={21} color={active ? colors.primaryOn : colors.text} />
      <Txt variant="faint" style={{ color: active ? colors.primaryOn : colors.textMuted }}>{label}</Txt>
    </Pressable>
  );
}

function StateButton({ label, active, disabled, onPress }: {
  label: string;
  active?: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(active), disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.md,
        borderWidth: 1, borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primary : colors.surfaceAlt,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Txt style={{ color: active ? colors.primaryOn : colors.text }}>{label}</Txt>
    </Pressable>
  );
}

export function HeadAim({ movement, connected, onAction }: Props) {
  const [draft, setDraft] = useState(() => movementToAim(movement));
  const draftRef = useRef(draft);
  const editing = useRef(false);
  const lastSent = useRef(0);
  const lastSentRotation = useRef<typeof draft | null>(null);
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  useEffect(() => {
    if (editing.current) return;
    const next = movementToAim(movement);
    draftRef.current = next;
    setDraft(next);
  }, [movement?.yaw, movement?.pitch]);

  const change = (next: typeof draft, force = false) => {
    draftRef.current = next;
    setDraft(next);
    if (lastSentRotation.current?.yaw === next.yaw && lastSentRotation.current?.pitch === next.pitch) return;
    const now = Date.now();
    if (!force && now - lastSent.current < 100) return;
    lastSent.current = now;
    lastSentRotation.current = next;
    const rotation: Rotation = aimToRotation(next);
    onActionRef.current("setHeadRotation", [rotation]);
  };

  const aimYaw = (x: number, y: number, force = false) => {
    const dx = x - DIAL_SIZE / 2;
    const dy = y - DIAL_SIZE / 2;
    if (Math.hypot(dx, dy) < 12) return;
    change({ ...draftRef.current, yaw: wrap(Math.round(Math.atan2(dx, -dy) * 180 / Math.PI)) }, force);
  };

  const aimPitch = (y: number, force = false) => {
    const pitch = clamp(Math.round(((y - 10) / (PITCH_HEIGHT - 20)) * 180 - 90));
    change({ ...draftRef.current, pitch }, force);
  };

  const aimYawRef = useRef(aimYaw);
  aimYawRef.current = aimYaw;
  const aimPitchRef = useRef(aimPitch);
  aimPitchRef.current = aimPitch;

  const yawGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(connected)
        .runOnJS(true)
        .minDistance(0)
        .onBegin((event) => {
          editing.current = true;
          aimYawRef.current(event.x, event.y);
        })
        .onUpdate((event) => {
          aimYawRef.current(event.x, event.y);
        })
        .onEnd((event) => {
          aimYawRef.current(event.x, event.y, true);
        })
        .onFinalize(() => {
          editing.current = false;
        }),
    [connected],
  );

  const pitchGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(connected)
        .runOnJS(true)
        .minDistance(0)
        .onBegin((event) => {
          editing.current = true;
          aimPitchRef.current(event.y);
        })
        .onUpdate((event) => {
          aimPitchRef.current(event.y);
        })
        .onEnd((event) => {
          aimPitchRef.current(event.y, true);
        })
        .onFinalize(() => {
          editing.current = false;
        }),
    [connected],
  );

  const angle = radians(draft.yaw);
  const facing = compass[Math.round(draft.yaw / 45) % compass.length];

  return (
    <View style={{ gap: spacing.sm }}>
      <Txt variant="label">Look</Txt>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.lg, flexWrap: "wrap" }}>
        <GestureDetector gesture={yawGesture}>
          <View
            accessibilityRole="adjustable"
            accessibilityLabel="Head direction"
            accessibilityState={{ disabled: !connected }}
            accessibilityValue={{ min: 0, max: 359, now: draft.yaw, text: `${draft.yaw} degrees from north` }}
            accessibilityActions={[{ name: "increment", label: "Turn right" }, { name: "decrement", label: "Turn left" }]}
            onAccessibilityAction={(event) => {
              if (!connected) return;
              const step = event.nativeEvent.actionName === "increment" ? 5 : -5;
              change({ ...draftRef.current, yaw: wrap(draftRef.current.yaw + step) }, true);
            }}
            style={[
              {
                width: DIAL_SIZE,
                height: DIAL_SIZE,
                borderRadius: DIAL_SIZE / 2,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surfaceAlt,
              },
              Platform.OS === "web" && ({ cursor: "crosshair", touchAction: "none", userSelect: "none" } as any),
            ]}
          >
            {([
              ["N", 104, 7], ["E", 199, 101], ["S", 104, 195], ["W", 10, 101],
            ] as const).map(([label, left, top]) => (
              <Txt key={label} variant="muted" pointerEvents="none" style={{ position: "absolute", left, top, width: 24, textAlign: "center" }}>{label}</Txt>
            ))}
            <View pointerEvents="none" style={{ position: "absolute", left: 32, top: 32, width: 154, height: 154, borderRadius: 77, borderWidth: 1, borderColor: colors.borderSubtle }} />
            <View pointerEvents="none" style={{ position: "absolute", left: 102, top: 102, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary }} />
            <View pointerEvents="none" style={{ position: "absolute", left: 104 + Math.sin(angle) * 65, top: 104 - Math.cos(angle) * 65, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />
          </View>
        </GestureDetector>
        <View style={{ width: 124, alignItems: "center", gap: 6 }}>
          <Txt variant="label" numberOfLines={1} style={{ textAlign: "center", fontVariant: ["tabular-nums"], width: "100%" }}>{draft.yaw}° · {facing}</Txt>
          <Txt variant="muted">Up</Txt>
          <GestureDetector gesture={pitchGesture}>
            <View
              accessibilityRole="adjustable"
              accessibilityLabel="Head pitch"
              accessibilityState={{ disabled: !connected }}
              accessibilityValue={{ min: -90, max: 90, now: draft.pitch, text: `${Math.abs(draft.pitch)} degrees ${draft.pitch < 0 ? "up" : draft.pitch > 0 ? "down" : "level"}` }}
              accessibilityActions={[{ name: "increment", label: "Look down" }, { name: "decrement", label: "Look up" }]}
              onAccessibilityAction={(event) => {
                if (!connected) return;
                const step = event.nativeEvent.actionName === "increment" ? 5 : -5;
                change({ ...draftRef.current, pitch: clamp(draftRef.current.pitch + step) }, true);
              }}
              style={[
                {
                  width: 42,
                  height: PITCH_HEIGHT,
                  borderRadius: 21,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceAlt,
                },
                Platform.OS === "web" && ({ cursor: "ns-resize", touchAction: "none", userSelect: "none" } as any),
              ]}
            >
              <View pointerEvents="none" style={{ position: "absolute", left: 5, right: 5, top: 10 + ((draft.pitch + 90) / 180) * (PITCH_HEIGHT - 20) - 4, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />
            </View>
          </GestureDetector>
          <Txt variant="muted">Down</Txt>
          <Txt variant="label" numberOfLines={1} style={{ textAlign: "center", fontVariant: ["tabular-nums"], width: "100%" }}>{Math.abs(draft.pitch)}° {draft.pitch < 0 ? "up" : draft.pitch > 0 ? "down" : "level"}</Txt>
        </View>
      </View>
    </View>
  );
}

export function BotMovement({ connected, movement, onAction }: Props) {
  const toggle = (control: Control) => onAction("toggleMovement", [control]);
  const moving = (["forward", "back", "left", "right", "jump", "sprint", "sneak"] as const)
    .some((control) => movement?.[control]);
  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <Txt variant="label">Move</Txt>
        <View style={{ alignItems: "center", gap: 5, paddingVertical: spacing.sm }}>
          <ControlButton label="Forward" icon="arrow-up" active={movement?.forward} disabled={!connected} onPress={() => toggle("forward")} />
          <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
            <ControlButton label="Left" icon="arrow-back" active={movement?.left} disabled={!connected} onPress={() => toggle("left")} />
            <View style={{ width: 76, height: 62, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
              <Txt variant="label">BOT</Txt>
            </View>
            <ControlButton label="Right" icon="arrow-forward" active={movement?.right} disabled={!connected} onPress={() => toggle("right")} />
          </View>
          <ControlButton label="Back" icon="arrow-down" active={movement?.back} disabled={!connected} onPress={() => toggle("back")} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {(["jump", "sprint", "sneak", "fly"] as const).map((control) => (
            <StateButton key={control} label={control.charAt(0).toUpperCase() + control.slice(1)} active={movement?.[control]} disabled={!connected} onPress={() => toggle(control)} />
          ))}
        </View>
        <Button title="Stop movement" small variant="secondary" disabled={!connected || !moving} onPress={() => onAction("stopMovement")} />
      </View>
      <HeadAim movement={movement} connected={connected} onAction={onAction} />
    </View>
  );
}
