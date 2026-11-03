import type { MaterialIcons } from "@expo/vector-icons";
import type { SFSymbol } from "expo-symbols";
import { colors } from "../../theme/theme";

// Read-only view of the desktop's AutomationDocument (app/src/common/automation.ts).
// Only the fields the phone shows are typed; the desktop stays the source of truth.

type Vec3 = { x: number; y: number; z: number };
type Position = { absolute: Vec3 };
type Window = { title?: string };
type Hand = "main" | "off";

interface StepBase {
  id: string;
  enabled: boolean;
  atMs: number;
  label?: string;
}

export type RecordingStep = StepBase & (
  | { kind: "movePath"; points: (Position & { atMs: number; yaw: number; pitch: number })[] }
  | { kind: "chat"; message: string }
  | { kind: "hotbar"; slot: number }
  | { kind: "openInventory" }
  | {
      kind: "windowClick";
      window: Window;
      slot: number;
      button: number;
      actionType: string;
      itemBefore?: { itemId: string; name?: string; count?: number };
    }
  | { kind: "closeWindow"; window?: Window }
  | { kind: "attackEntity" | "useEntity"; entity: { type: string; name?: string }; hand?: Hand }
  | { kind: "breakBlock" | "useBlock"; position: Position; face?: string; hand?: Hand; blockBefore?: string }
  | { kind: "useItem" | "releaseUseItem" | "swingArm" | "swapHands" | "wake" | "respawn"; hand?: Hand }
  | { kind: "dropItem"; entireStack?: boolean }
  | { kind: "screenAction"; action: string }
);

export type RecordingKind = RecordingStep["kind"];

export interface RecordingDocument {
  name: string;
  durationMs: number;
  source: { username?: string; serverAddress?: string };
  steps: RecordingStep[];
  interrupted?: boolean;
}

export const isRecordingDocument = (value: unknown): value is RecordingDocument =>
  typeof value === "object" && value !== null && Array.isArray((value as RecordingDocument).steps);

export const actionLabel = (kind: RecordingKind): string =>
  ({
    movePath: "Move",
    chat: "Chat",
    hotbar: "Hotbar",
    openInventory: "Open inventory",
    windowClick: "Window click",
    closeWindow: "Close window",
    attackEntity: "Attack",
    useEntity: "Interact",
    breakBlock: "Break block",
    useBlock: "Use block",
    useItem: "Use item",
    releaseUseItem: "Release item",
    swingArm: "Swing arm",
    swapHands: "Swap hands",
    dropItem: "Drop item",
    wake: "Wake up",
    respawn: "Respawn",
    screenAction: "Screen action",
  })[kind];

const entityName = (type: string) => type.replace(/^minecraft:/, "").replace(/_/g, " ");
const coords = ({ x, y, z }: Vec3) => `${Math.round(x)}, ${Math.round(y)}, ${Math.round(z)}`;

const pathDistance = (points: Position[]) => {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1].absolute;
    const b = points[i].absolute;
    total += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  }
  return total;
};

const turned = (points: { yaw: number; pitch: number }[]) =>
  points.some((point) => Math.abs(point.yaw - points[0].yaw) > 1 || Math.abs(point.pitch - points[0].pitch) > 1);

const describeMove = (points: Extract<RecordingStep, { kind: "movePath" }>["points"]) => {
  const distance = pathDistance(points);
  if (distance >= 0.05) return `${distance.toFixed(1)} blocks`;
  return turned(points) ? "Look around" : "Stand still";
};

/** The one line under the action name, or null when the name says it all. */
export const describeStep = (step: RecordingStep): string | null => {
  if (step.label) return step.label;
  switch (step.kind) {
    case "chat":
      return step.message || "Empty message";
    case "windowClick":
      return step.window.title ? `${step.window.title} · slot ${step.slot}` : `Slot ${step.slot}`;
    case "closeWindow":
      return step.window?.title ?? null;
    case "hotbar":
      return `Slot ${step.slot + 1}`;
    case "movePath":
      return describeMove(step.points);
    case "attackEntity":
    case "useEntity":
      return step.entity.name ?? entityName(step.entity.type);
    case "breakBlock":
    case "useBlock":
      return step.blockBefore ? entityName(step.blockBefore) : coords(step.position.absolute);
    case "dropItem":
      return step.entireStack ? "Entire stack" : null;
    case "screenAction":
      return step.action;
    default:
      return null;
  }
};

const handLabel = (hand?: Hand) => (hand === "off" ? "Off hand" : "Main hand");

/** Read-only fields for the step sheet. */
export const stepDetails = (step: RecordingStep): [label: string, value: string][] => {
  const rows: [string, string][] = [];
  switch (step.kind) {
    case "chat":
      rows.push(["Message", step.message || "Empty"]);
      break;
    case "hotbar":
      rows.push(["Slot", String(step.slot + 1)]);
      break;
    case "windowClick":
      if (step.window.title) rows.push(["Window", step.window.title]);
      rows.push(["Slot", String(step.slot)], ["Click", step.button === 1 ? "Right" : "Left"], ["Type", step.actionType]);
      if (step.itemBefore)
        rows.push(["Item", `${step.itemBefore.name ?? entityName(step.itemBefore.itemId)}${step.itemBefore.count ? ` ×${step.itemBefore.count}` : ""}`]);
      break;
    case "closeWindow":
      if (step.window?.title) rows.push(["Window", step.window.title]);
      break;
    case "attackEntity":
    case "useEntity":
      rows.push(["Entity", entityName(step.entity.type)]);
      if (step.entity.name) rows.push(["Name", step.entity.name]);
      rows.push(["Hand", handLabel(step.hand)]);
      break;
    case "breakBlock":
    case "useBlock":
      if (step.blockBefore) rows.push(["Block", entityName(step.blockBefore)]);
      rows.push(["Position", coords(step.position.absolute)]);
      if (step.face) rows.push(["Face", step.face]);
      break;
    case "movePath": {
      const first = step.points[0];
      const last = step.points.at(-1);
      rows.push(["Movement", describeMove(step.points)]);
      if (first && last) {
        rows.push(["Duration", `${((last.atMs - first.atMs) / 1000).toFixed(1)} s`]);
        rows.push(["From", coords(first.absolute)], ["To", coords(last.absolute)]);
      }
      break;
    }
    case "useItem":
    case "releaseUseItem":
    case "swingArm":
      rows.push(["Hand", handLabel(step.hand)]);
      break;
    case "dropItem":
      rows.push(["Amount", step.entireStack ? "Entire stack" : "One item"]);
      break;
    case "screenAction":
      rows.push(["Action", step.action]);
      break;
  }
  return rows;
};

type StepIcon = { sf: SFSymbol; material: keyof typeof MaterialIcons.glyphMap; tone: "move" | "chat" | "combat" | "inventory" | "world" };

const icons: Record<RecordingKind, StepIcon> = {
  movePath: { sf: "figure.walk", material: "directions-walk", tone: "move" },
  chat: { sf: "bubble.left", material: "chat-bubble-outline", tone: "chat" },
  hotbar: { sf: "rectangle.split.3x1", material: "view-week", tone: "inventory" },
  openInventory: { sf: "backpack", material: "backpack", tone: "inventory" },
  windowClick: { sf: "hand.tap", material: "touch-app", tone: "inventory" },
  closeWindow: { sf: "xmark.square", material: "close", tone: "inventory" },
  dropItem: { sf: "arrow.down.circle", material: "arrow-circle-down", tone: "inventory" },
  swapHands: { sf: "arrow.left.arrow.right", material: "swap-horiz", tone: "inventory" },
  attackEntity: { sf: "bolt", material: "flash-on", tone: "combat" },
  swingArm: { sf: "wind", material: "air", tone: "combat" },
  useEntity: { sf: "hand.raised", material: "pan-tool", tone: "world" },
  breakBlock: { sf: "hammer", material: "construction", tone: "world" },
  useBlock: { sf: "cube", material: "view-in-ar", tone: "world" },
  useItem: { sf: "sparkles", material: "auto-awesome", tone: "world" },
  releaseUseItem: { sf: "arrow.uturn.down", material: "undo", tone: "world" },
  wake: { sf: "sun.max", material: "wb-sunny", tone: "world" },
  respawn: { sf: "arrow.counterclockwise", material: "replay", tone: "world" },
  screenAction: { sf: "rectangle.on.rectangle", material: "web-asset", tone: "world" },
};

export const stepIcon = (kind: RecordingKind) => icons[kind] ?? icons.screenAction;

/** Read at render time so tones follow theme switches. */
export const toneColors = (tone: StepIcon["tone"]) =>
  ({
    move: { fg: colors.info, bg: colors.infoSoft },
    chat: { fg: colors.primary, bg: colors.primarySoft },
    combat: { fg: colors.danger, bg: colors.dangerSoft },
    inventory: { fg: colors.warning, bg: colors.warningSoft },
    world: { fg: colors.success, bg: colors.successSoft },
  })[tone];

/** m:ss, as on the desktop */
export const clock = (ms: number) => {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};
