import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import type {
  TriggerActionType,
  TriggerEvent,
} from "../generated/client-contract/triggers";

export * from "../generated/client-contract/triggers";

type IconName = ComponentProps<typeof Ionicons>["name"];

export const TRIGGER_EVENT_ICONS: Record<TriggerEvent, IconName> = {
  chat: "chatbubble-outline",
  join: "wifi-outline",
  disconnect: "cloud-offline-outline",
  kicked: "exit-outline",
  death: "heart-dislike-outline",
  lowHealth: "heart-half-outline",
  playerNearby: "eye-outline",
  playerJoined: "person-add-outline",
  playerLeft: "person-remove-outline",
  inventoryFull: "file-tray-full-outline",
  itemReceived: "gift-outline",
};

export const TRIGGER_ACTION_ICONS: Record<TriggerActionType, IconName> = {
  notification: "notifications-outline",
  discord: "paper-plane-outline",
  chat: "chatbox-ellipses-outline",
  scriptAction: "play-circle-outline",
  log: "document-text-outline",
};
