import type { ChatClick, ChatLine } from "./chat";

export type InventoryItem = {
  name?: string;
  displayName?: string;
  count?: number;
  slot?: number;
  display?: { name?: string; lore?: string | string[] };
};

export type InventoryPacket = {
  items?: Array<InventoryItem | null>;
  title?: string;
  inventoryStart?: number;
  selected?: number;
  selectedItem?: InventoryItem | null;
  isInventory?: boolean;
  /** Window type, e.g. `minecraft:anvil` */
  type?: string;
  /** Input screen the server opened (sign editor, book, dialog) */
  prompt?: ScreenPrompt | null;
  /** PNG data URI of the held map */
  map?: string | null;
};

export type DialogInput = { key: string; label: string; showLabel: boolean } & (
  | { type: "text"; initial: string; maxLength: number; multiline: boolean }
  | { type: "boolean"; initial: boolean }
  | { type: "single_option"; options: { id: string; display: string }[]; initial: number }
  | { type: "number_range"; start: number; end: number; step?: number; initial: number }
);

export type DialogValue = string | number | boolean;

export type ScreenPrompt =
  | { kind: "sign"; position: { x: number; y: number; z: number }; front: boolean; lines: string[] }
  | { kind: "book"; title: string; pages: ChatLine[] }
  | {
      kind: "dialog";
      title: string;
      body: { text?: ChatLine; item?: { name: string; count: number } }[];
      inputs: DialogInput[];
      buttons: { label: string; tooltip?: string; click?: ChatClick }[];
      columns: number;
      canEscape: boolean;
    };

export type InventorySection = {
  id: "container" | "storage" | "hotbar";
  label: string;
  slots: number[];
};

const range = (start: number, length: number) =>
  Array.from({ length: Math.max(0, length) }, (_, index) => start + index);

/** Mirrors Mineflayer's window layout: container, 27 storage slots, hotbar. */
export function inventorySections(packet?: InventoryPacket): InventorySection[] {
  const start = Math.max(0, packet?.inventoryStart ?? 9);
  const sections: InventorySection[] = [];
  if (!packet?.isInventory && start > 0)
    sections.push({ id: "container", label: packet?.title || "Container", slots: range(0, start) });
  sections.push({ id: "storage", label: "Inventory", slots: range(start, 27) });
  sections.push({ id: "hotbar", label: "Hotbar", slots: range(start + 27, 9) });
  return sections;
}

export const playerEquipmentSlots = [5, 6, 7, 8] as const;
export const playerCraftingSlots = [1, 2, 3, 4] as const;

export function itemAbbreviation(name?: string) {
  const words = String(name || "item")
    .replace(/^minecraft:/, "")
    .split(/[_\s-]+/)
    .filter(Boolean);
  if (words.length > 1) return words.slice(0, 3).map((word) => word[0]).join("").toUpperCase();
  return (words[0] || "?").slice(0, 3).toUpperCase();
}
