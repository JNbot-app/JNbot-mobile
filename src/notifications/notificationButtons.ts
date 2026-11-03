import type { Router } from "expo-router";
import type { NotificationButton } from "../generated/client-contract/mobileClientContract";

/** Opens the screen a notification button points at. */
export function openNotificationButton(router: Router, button: NotificationButton) {
  if (button.action === "openSettings") {
    router.push({ pathname: "/(app)/settings", params: button.tab ? { section: button.tab } : {} });
    return;
  }
  router.push({ pathname: "/(app)/bot/[botId]", params: { botId: String(button.botId) } });
}
