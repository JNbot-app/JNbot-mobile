import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import textures from "../../generated/inventory-textures.json";

const textureMap = textures as Record<string, string>;
const textureSourceCache = new Map<string, { uri: string }>();

function getTextureSource(name?: string): { uri: string } | undefined {
  if (!name) return undefined;
  const key = name.replace(/^minecraft:/, "");
  const uri = textureMap[key];
  if (!uri) return undefined;
  let source = textureSourceCache.get(key);
  if (!source) {
    source = { uri };
    textureSourceCache.set(key, source);
  }
  return source;
}
import {
  inventorySections,
  itemAbbreviation,
  playerCraftingSlots,
  playerEquipmentSlots,
  type InventoryItem,
  type InventoryPacket,
} from "../../features/inventory";
import type { BotAction } from "../../generated/client-contract/mobileClientContract";
import { RichText } from "../RichText";
import { PromptScreen } from "./PromptScreen";
import { AnvilNameField } from "./AnvilNameField";
import { useChatClickHandler } from "./ChatMessage";
import { Button, Txt } from "../ui";
import { colors, radii, spacing } from "../../theme/theme";

type Props = {
  inventory?: InventoryPacket;
  disabled: boolean;
  onAction: (action: BotAction, data?: unknown[]) => void;
};

export function MinecraftInventory({ inventory, disabled, onAction }: Props) {
  const [width, setWidth] = useState(320);
  const [detailSlot, setDetailSlot] = useState<number | null>(null);
  const size = Math.max(30, Math.min(50, Math.floor((width - spacing.md * 2 - 16) / 9)));
  const sections = useMemo(() => inventorySections(inventory), [inventory]);
  const detailItem = detailSlot === null ? null : inventory?.items?.[detailSlot] ?? null;
  const click = useCallback(
    (slot: number, button = 0, mode?: number) => {
      if (disabled) return;
      onAction("inventoryClick", [{ slot, button, ...(mode === undefined ? {} : { mode }) }]);
    },
    [disabled, onAction],
  );
  const promptClick = useChatClickHandler((command) => onAction("chatMessage", [command]), () => {});
  const source = inventory?.items?.[0];
  const sourceName = source?.display?.name || source?.displayName || "";
  return (
    <View style={styles.root} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View style={styles.toolbar}>
        <View style={{ flex: 1 }}>
          <RichText style={styles.title}>{inventory?.title || "Inventory"}</RichText>
          <Txt variant="faint">Tap to left-click · hold for more actions</Txt>
        </View>
        <Pressable accessibilityLabel="Refresh inventory" style={styles.toolButton} onPress={() => onAction("sendInventoryPacket")}>
          <Ionicons name="refresh" size={20} color={colors.text} />
        </Pressable>
        <Pressable accessibilityLabel="Close inventory window" disabled={!inventory} style={[styles.toolButton, !inventory && { opacity: 0.45 }]} onPress={() => onAction("closeWindow")}>
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
      </View>
      {inventory?.selectedItem ? (
        <View style={styles.heldItem}>
          <ItemSlot
            slot={-1}
            item={inventory.selectedItem}
            size={size}
            held
            disabled
            onPress={click}
            onLongPress={setDetailSlot}
          />
          <View style={{ flex: 1 }}>
            <Txt variant="faint">Holding</Txt>
            <RichText style={styles.title}>
              {inventory.selectedItem.display?.name || inventory.selectedItem.displayName || inventory.selectedItem.name || "Item"}
            </RichText>
          </View>
        </View>
      ) : null}
      {!inventory ? (
        <InventoryLoading size={size} />
      ) : inventory.prompt ? (
        <PromptScreen prompt={inventory.prompt} disabled={disabled} onClick={promptClick} onAction={onAction} />
      ) : (
      <View style={styles.frame}>
        {inventory.map ? (
          <Image source={{ uri: inventory.map }} style={[styles.map, { width: size * 6, height: size * 6 }]} contentFit="contain" accessibilityLabel="Held map" />
        ) : null}
        {inventory.type === "minecraft:anvil" ? (
          <AnvilNameField
            key={`${source?.name}|${sourceName}`}
            name={sourceName}
            disabled={disabled || !source?.name}
            onRename={(name) => onAction("renameItem", [name])}
          />
        ) : null}
        {inventory?.isInventory ? (
          <PlayerEquipment items={inventory.items ?? []} size={size} selected={inventory.selected} onPress={click} onDetail={setDetailSlot} />
        ) : null}
        {sections.map((section) => {
          const showTitle = section.id === "container" || (!inventory?.isInventory && section.id === "storage");
          const isHotbar = section.id === "hotbar";
          return (
            <View key={section.id} style={[styles.section, isHotbar && styles.hotbarSection]}>
              {showTitle ? <RichText style={styles.sectionTitle}>{section.label}</RichText> : null}
              <View style={[styles.grid, { width: size * 9 }]}>
                {section.slots.map((slot) => (
                  <ItemSlot
                    key={slot}
                    slot={slot}
                    item={inventory?.items?.[slot]}
                    size={size}
                    selected={section.id === "hotbar" && inventory?.selected === slot - (inventory?.inventoryStart ?? 9) - 27}
                    disabled={disabled}
                    onPress={click}
                    onLongPress={setDetailSlot}
                  />
                ))}
              </View>
            </View>
          );
        })}
        {!inventory.items?.length ? <Txt variant="muted" style={styles.emptyInventory}>This inventory is empty.</Txt> : null}
      </View>
      )}
      <ItemDetails
        slot={detailSlot}
        item={detailItem}
        visible={detailSlot !== null}
        onClose={() => setDetailSlot(null)}
        onAction={(button, mode) => {
          if (detailSlot !== null) click(detailSlot, button, mode);
          setDetailSlot(null);
        }}
      />
    </View>
  );
}

function InventoryLoading({ size }: { size: number }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading inventory" style={styles.loadingFrame}>
      <ActivityIndicator color={colors.primary} size="large" />
      <View style={{ alignItems: "center", gap: 3 }}>
        <Txt variant="heading">Loading inventory</Txt>
        <Txt variant="muted">Waiting for the bot’s current window…</Txt>
      </View>
      <View style={[styles.loadingGrid, { width: size * 9 }]}>
        {Array.from({ length: 27 }, (_, index) => (
          <View key={index} style={[styles.loadingSlot, { width: size, height: size }]} />
        ))}
      </View>
    </View>
  );
}

const armorIcons: Record<number, keyof typeof Ionicons.glyphMap> = {
  5: "person-outline",
  6: "shirt-outline",
  7: "body-outline",
  8: "footsteps-outline",
};

const PlayerEquipment = React.memo(function PlayerEquipment({ items, size, selected, onPress, onDetail }: {
  items: Array<InventoryItem | null>; size: number; selected?: number;
  onPress: (slot: number) => void; onDetail: (slot: number) => void;
}) {
  return (
    <View style={[styles.playerArea, { width: size * 9 }]}>
      <View style={styles.playerLeftArea}>
        <View style={styles.armorColumn}>
          {playerEquipmentSlots.map((slot) => (
            <ItemSlot
              key={slot}
              slot={slot}
              item={items[slot]}
              size={size}
              placeholderIcon={armorIcons[slot]}
              onPress={onPress}
              onLongPress={onDetail}
            />
          ))}
        </View>
        <View style={[styles.playerPreview, { height: size * 4, width: Math.round(size * 2.5) }]}>
          <Ionicons name="person" size={size * 2.1} color="#6c7a89" />
        </View>
      </View>

      <View style={[styles.playerRightArea, { height: size * 4 }]}>
        <View style={styles.craftingSection}>
          <Txt variant="faint" style={styles.craftingLabel}>Crafting</Txt>
          <View style={styles.craftingRow}>
            <View style={[styles.craftingGrid, { width: size * 2, height: size * 2 }]}>
              {playerCraftingSlots.map((slot) => (
                <ItemSlot
                  key={slot}
                  slot={slot}
                  item={items[slot]}
                  size={size}
                  onPress={onPress}
                  onLongPress={onDetail}
                />
              ))}
            </View>
            <View style={styles.arrowContainer}>
              <Ionicons name="arrow-forward" size={Math.max(16, Math.round(size * 0.55))} color="#4a4a4a" />
            </View>
            <ItemSlot
              slot={0}
              item={items[0]}
              size={size}
              onPress={onPress}
              onLongPress={onDetail}
            />
          </View>
        </View>

        <View style={styles.offhandRow}>
          <ItemSlot
            slot={45}
            item={items[45]}
            size={size}
            placeholderIcon="shield-outline"
            selected={selected === 45}
            onPress={onPress}
            onLongPress={onDetail}
          />
        </View>
      </View>
    </View>
  );
});

const ItemSlot = React.memo(function ItemSlot({
  slot,
  item,
  size,
  selected,
  held,
  disabled,
  placeholderIcon,
  onPress,
  onLongPress,
}: {
  slot: number;
  item?: InventoryItem | null;
  size: number;
  selected?: boolean;
  held?: boolean;
  disabled?: boolean;
  placeholderIcon?: keyof typeof Ionicons.glyphMap;
  onPress: (slot: number) => void;
  onLongPress: (slot: number) => void;
}) {
  const [failedName, setFailedName] = useState<string | null>(null);
  const source = getTextureSource(item?.name);
  const failed = Boolean(item?.name && failedName === item.name);
  const handlePress = useCallback(() => onPress(slot), [onPress, slot]);
  const handleLongPress = useCallback(() => onLongPress(slot), [onLongPress, slot]);

  return (
    <Pressable
      accessibilityLabel={item?.displayName || item?.name || "Empty slot"}
      hitSlop={Math.max(0, (44 - size) / 2)}
      disabled={disabled}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={330}
      style={[styles.slot, { width: size, height: size }, selected && styles.selectedSlot]}
    >
      {item ? source && !failed ? (
        <Image
          source={source}
          recyclingKey={item.name}
          cachePolicy="memory-disk"
          contentFit="contain"
          style={{ width: size - 8, height: size - 8 }}
          onError={() => item?.name && setFailedName(item.name)}
        />
      ) : (
        <Txt style={[styles.abbreviation, { fontSize: Math.max(8, size * 0.22) }]} numberOfLines={1}>
          {itemAbbreviation(item.name || item.displayName)}
        </Txt>
      ) : placeholderIcon ? (
        <Ionicons
          name={placeholderIcon}
          size={Math.max(14, Math.round(size * 0.48))}
          color="#555"
          style={styles.placeholderIcon}
        />
      ) : null}
      {(item?.count ?? 0) > 1 ? <Txt style={[styles.count, held && styles.heldCount]}>{item?.count}</Txt> : null}
    </Pressable>
  );
});

function ItemDetails({ slot, item, visible, onClose, onAction }: {
  slot: number | null; item: InventoryItem | null; visible: boolean; onClose: () => void;
  onAction: (button: number, mode?: number) => void;
}) {
  const lore = Array.isArray(item?.display?.lore) ? item.display.lore : String(item?.display?.lore ?? "").split("\n").filter(Boolean);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.detailSafe}>
        <View style={styles.detailHeader}>
          <View style={{ flex: 1 }}>
            <RichText style={styles.detailTitle}>{item?.display?.name || item?.displayName || item?.name || "Empty slot"}</RichText>
            <Txt variant="faint">Slot {slot ?? "—"}{item?.count ? ` · ${item.count} item${item.count === 1 ? "" : "s"}` : ""}</Txt>
          </View>
          <Pressable accessibilityLabel="Close item details" style={styles.toolButton} onPress={onClose}><Ionicons name="close" size={23} color={colors.text} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.lore}>
          {lore.length ? lore.map((line, index) => <RichText key={`${index}-${line}`} style={styles.loreLine}>{line}</RichText>) : <Txt variant="muted">No item description.</Txt>}
        </ScrollView>
        <View style={styles.detailActions}>
          <Button title="Right-click" variant="secondary" full disabled={!item} onPress={() => onAction(1)} />
          <Button title="Shift-click" variant="secondary" full disabled={!item} onPress={() => onAction(0, 1)} />
          <Button title="Drop" variant="danger" full disabled={!item} onPress={() => onAction(0, 4)} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  heldItem: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  toolbar: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  toolButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.surfaceAlt },
  title: { color: colors.text, fontSize: 16, fontWeight: "700" },
  map: { marginBottom: spacing.sm, padding: 8, backgroundColor: "#e8dcb5", borderWidth: 2, borderColor: "#8b7550" },
  frame: { alignItems: "center", padding: spacing.md, borderWidth: 4, borderTopColor: "#f5f5f5", borderLeftColor: "#f5f5f5", borderRightColor: "#555", borderBottomColor: "#555", borderRadius: radii.md, backgroundColor: "#c6c6c6" },
  loadingFrame: { minHeight: 300, alignItems: "center", justifyContent: "center", gap: spacing.lg, padding: spacing.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surface },
  loadingGrid: { flexDirection: "row", flexWrap: "wrap", opacity: 0.28 },
  loadingSlot: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  emptyInventory: { padding: spacing.lg, color: "#3b3b3b" },
  section: { alignItems: "center" },
  hotbarSection: { marginTop: 4 },
  sectionTitle: { alignSelf: "flex-start", color: "#242424", fontSize: 12, fontWeight: "700", marginBottom: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  slot: { alignItems: "center", justifyContent: "center", backgroundColor: "#8b8b8b", borderWidth: 2, borderTopColor: "#373737", borderLeftColor: "#373737", borderRightColor: "#fff", borderBottomColor: "#fff" },
  selectedSlot: { borderColor: "#f7f279", backgroundColor: "#b8b477" },
  placeholderIcon: { opacity: 0.45 },
  abbreviation: { color: "#eee", fontWeight: "900", textAlign: "center", textShadowColor: "#222", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 0 },
  count: { position: "absolute", right: 2, bottom: 0, color: "#fff", fontSize: 11, fontWeight: "900", textShadowColor: "#111", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1 },
  heldCount: { color: "#000", textShadowColor: "transparent" },
  playerArea: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.sm },
  playerLeftArea: { flexDirection: "row", gap: 4 },
  armorColumn: { flexDirection: "column" },
  playerPreview: { alignItems: "center", justifyContent: "center", backgroundColor: "#111", borderWidth: 2, borderTopColor: "#373737", borderLeftColor: "#373737", borderRightColor: "#fff", borderBottomColor: "#fff" },
  playerRightArea: { flexDirection: "column", justifyContent: "space-between" },
  craftingSection: { flexDirection: "column", gap: 2 },
  craftingLabel: { color: "#242424", fontSize: 11, fontWeight: "700" },
  craftingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  craftingGrid: { flexDirection: "row", flexWrap: "wrap" },
  arrowContainer: { justifyContent: "center", alignItems: "center", paddingHorizontal: 2 },
  offhandRow: { flexDirection: "row", alignItems: "center" },
  detailSafe: { flex: 1, padding: spacing.lg, backgroundColor: colors.bg, gap: spacing.lg },
  detailHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  detailTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  lore: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: "#160029" },
  loreLine: { color: colors.text, fontSize: 15, lineHeight: 22 },
  detailActions: { gap: spacing.sm },
});
