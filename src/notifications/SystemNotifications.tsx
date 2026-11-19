import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useStore } from "../store/store";
import type { AppNotification } from "../store/types";
import type { NotificationButton } from "../generated/client-contract/mobileClientContract";
import { openNotificationButton } from "./notificationButtons";

const PREFERENCE_KEY = "jnbot_system_notifications";
const CHANNEL_ID = "notifications";
const categories = new Map<string, Promise<string>>();

export async function loadSystemNotificationsPreference(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PREFERENCE_KEY)) !== "false";
  } catch {
    return true;
  }
}

export async function saveSystemNotificationsPreference(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFERENCE_KEY, enabled ? "true" : "false");
  } catch (error) {
    console.warn("[SystemNotifications] Failed to save preference:", error);
  }
}

export async function hasSystemNotificationPermission(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Resolves whether the OS lets JNbot show notifications, asking once if it still can. */
export async function requestSystemNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || !current.canAskAgain) return current.granted;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    // iOS throws UNErrorDomain Code=1 when notifications aren't allowed for this install (e.g. sideloaded builds).
    return false;
  }
}

/** Buttons become notification actions; categories are shared by notifications with the same labels. */
function categoryFor(buttons: NotificationButton[] | undefined) {
  if (!buttons?.length) return undefined;
  const id = `jnbot:${buttons.map((button) => button.label).join("|")}`;
  if (!categories.has(id)) {
    categories.set(
      id,
      Notifications.setNotificationCategoryAsync(
        id,
        buttons.map((button, index) => ({
          identifier: String(index),
          buttonTitle: button.label,
          options: { opensAppToForeground: true },
        })),
      ).then(() => id),
    );
  }
  return categories.get(id);
}

async function present(item: AppNotification) {
  if (!(await loadSystemNotificationsPreference()) || !(await hasSystemNotificationPermission())) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: item.title,
      body: item.message || undefined,
      data: { buttons: item.buttons ?? [] },
      categoryIdentifier: await categoryFor(item.buttons),
    },
    trigger: Platform.OS === "android" ? { channelId: CHANNEL_ID } : null,
  });
}

/** Mirrors new JNbot notifications to the OS while the app is in the background. */
export function SystemNotifications() {
  if (Platform.OS === "web") return null;
  return <NativeSystemNotifications />;
}

function NativeSystemNotifications() {
  const router = useRouter();

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === "android") {
      void Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: "Notifications",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = useStore.subscribe((state, prev) => {
      if (state.unread <= prev.unread || AppState.currentState === "active") return;
      void present(state.notifications[0]).catch((error) =>
        console.warn("[SystemNotifications] Failed to show notification:", error),
      );
    });
    const responses = Notifications.addNotificationResponseReceivedListener(({ actionIdentifier, notification }) => {
      const buttons = notification.request.content.data?.buttons as NotificationButton[] | undefined;
      const button = actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
        ? buttons?.[0]
        : buttons?.[Number(actionIdentifier)];
      if (button) openNotificationButton(router, button);
    });
    return () => {
      unsubscribe();
      responses.remove();
    };
  }, [router]);

  return null;
}
