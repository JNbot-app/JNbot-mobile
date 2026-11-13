import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Txt } from "../ui";
import { PickerField, type Choice } from "../PickerField";
import { SettingsField as Field, SettingsToggle as Toggle } from "./SettingsFields";
import { SettingsGroup } from "./SettingsGroup";
import { ProxyEditor } from "./ProxyEditor";
import { KickBehaviorEditor } from "./KickBehaviorEditor";
import { AppearanceSettings } from "./AppearanceSettings";
import { BackgroundExecution } from "./BackgroundExecution";
import { useStore } from "../../store/store";
import { useSystemNotificationsSetting } from "../../notifications/useSystemNotificationsSetting";
import { colors, spacing } from "../../theme/theme";
import type { KickBehaviorConfig, ProxyConfig } from "../../features/appSettings";

type Values = Record<string, unknown>;

/** Draft state shared by every editable settings page; saved together from the save bar. */
export type DraftProps = {
  bot: Values;
  setBot: React.Dispatch<React.SetStateAction<Values>>;
  automation: Values;
  setAutomation: React.Dispatch<React.SetStateAction<Values>>;
  proxy: ProxyConfig;
  setProxy: (value: ProxyConfig) => void;
  errors: Record<string, string | null>;
};

const RENDER_DISTANCE_OPTIONS: Choice[] = [
  { label: "2 chunks", value: 2, description: "Minimal memory and CPU" },
  { label: "4 chunks", value: 4, description: "Low compute footprint" },
  { label: "6 chunks", value: 6 },
  { label: "8 chunks", value: 8, description: "Balanced view distance" },
  { label: "10 chunks", value: 10 },
  { label: "12 chunks (Default)", value: 12, description: "Standard render distance" },
  { label: "16 chunks", value: 16, description: "Maximum view distance" },
];

const JOIN_TIMEOUT_OPTIONS: Choice[] = [
  { label: "No timeout (0s)", value: 0 },
  ...[2, 5, 10, 15, 20, 25, 30, 45, 60, 90].map((s) => ({
    label: `${s} seconds${s === 10 ? " (Default)" : ""}`,
    value: s * 1000,
  })),
];

const FALLBACK_VERSIONS = ["1.8.9", "1.12.2", "1.16.5", "1.18.2", "1.19.4", "1.20.1", "1.20.4", "1.20.6", "1.21.1", "1.21.4"];

export function InlineError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.error}>
      <Ionicons name="alert-circle" size={17} color={colors.danger} />
      <Txt variant="muted" style={styles.errorText}>{message}</Txt>
    </View>
  );
}

export function PickerRow({ label, help, ...props }: { label: string; help?: string } & React.ComponentProps<typeof PickerField>) {
  return (
    <View style={styles.field}>
      <Txt variant="label">{label}</Txt>
      <PickerField {...props} />
      {help ? <Txt variant="faint">{help}</Txt> : null}
    </View>
  );
}

export function GeneralPage() {
  return (
    <>
      <AppearanceSettings />
      <BackgroundExecution />
    </>
  );
}

export function NotificationsPage() {
  const [enabled, setEnabled] = useSystemNotificationsSetting();
  return (
    <SettingsGroup footer="Notifications are always shown inside the app.">
      <Toggle
        label="System notifications"
        description="Show JNbot notifications on your phone while the app is in the background."
        value={enabled}
        onChange={(value) => void setEnabled(value)}
      />
    </SettingsGroup>
  );
}

export function ConnectionPage({ bot, setBot, automation, setAutomation, errors }: DraftProps) {
  const jnVersions = useStore((state) => state.JNdata?.versions);
  const versionOptions: Choice[] = useMemo(
    () => (jnVersions?.length ? jnVersions : FALLBACK_VERSIONS).map((v) => ({ label: v, value: v })),
    [jnVersions],
  );
  const patchBot = (patch: Values) => setBot((item) => ({ ...item, ...patch }));
  return (
    <>
      <SettingsGroup title="Server">
        <PickerRow
          label="Minecraft version"
          title="Select Minecraft version"
          options={versionOptions}
          value={String(bot.version ?? "1.8.9")}
          freeSolo
          onChange={(value) => patchBot({ version: String(value ?? "1.8.9") })}
          placeholder="1.8.9"
        />
        <Field label="Server host or IP" value={String(bot.ip ?? "")} onChangeText={(ip) => patchBot({ ip })} placeholder="play.example.com" autoCapitalize="none" />
        <Field label="Server port" value={String(bot.port ?? "")} onChangeText={(port) => patchBot({ port: Number(port) || port })} keyboardType="number-pad" placeholder="25565" />
        <Toggle label="Rotate server IPs" description="Scripts use different IPs to join the server to avoid getting kicked for joining too fast." value={bot.serverIpRotation === true} onChange={(serverIpRotation) => patchBot({ serverIpRotation })} />
      </SettingsGroup>
      <SettingsGroup title="Joining">
        <Toggle label="Retry after login failure" description="Automatically rejoin when logging in fails." value={bot.retryOnLoginFail !== false} onChange={(retryOnLoginFail) => patchBot({ retryOnLoginFail })} />
        <PickerRow
          label="Join timeout"
          help="When the bot has not joined within this time, it stops waiting."
          title="Select join timeout"
          options={JOIN_TIMEOUT_OPTIONS}
          value={Number(bot.joinServerTimeout ?? 10000)}
          onChange={(value) => patchBot({ joinServerTimeout: Number(value) })}
          placeholder="10 seconds"
        />
        <Field label="Bot join delay (ms)" value={String(automation.join_delay ?? "")} onChangeText={(value) => setAutomation((item) => ({ ...item, join_delay: Number(value) || value }))} keyboardType="number-pad" />
      </SettingsGroup>
      <SettingsGroup title="Kick behavior" footer="How a bot reacts when the server kicks it.">
        <KickBehaviorEditor value={bot.kickBehaviour as KickBehaviorConfig} onChange={(kickBehaviour) => patchBot({ kickBehaviour })} />
      </SettingsGroup>
      <InlineError message={errors.connection} />
    </>
  );
}

export function BehaviorPage({ bot, setBot, errors }: DraftProps) {
  const patchBot = (patch: Values) => setBot((item) => ({ ...item, ...patch }));
  return (
    <>
      <SettingsGroup title="Verification">
        <Toggle label="Auto V4guard verification" description="Automatically opens a browser verification when V4guard flags the bot." value={bot.auto_v4guard !== false} onChange={(auto_v4guard) => patchBot({ auto_v4guard })} />
        <Toggle label="Map captcha prompt" description="When a bot holds a map right after joining, show it to you so you can type the captcha code." value={bot.captcha_prompt === true} onChange={(captcha_prompt) => patchBot({ captcha_prompt })} />
        <Toggle label="Auto resource pack accept" description="Automatically accepts resource packs when the server offers them." value={bot.autoResourcePackAccept !== false} onChange={(autoResourcePackAccept) => patchBot({ autoResourcePackAccept })} />
      </SettingsGroup>
      <SettingsGroup title="Performance">
        <PickerRow
          label="Render distance"
          help="Lower values reduce memory and CPU usage on mobile devices."
          title="Select render distance"
          options={RENDER_DISTANCE_OPTIONS}
          value={Number(bot.render_distance ?? 12)}
          onChange={(value) => patchBot({ render_distance: Number(value) })}
          placeholder="12 chunks"
        />
        <Toggle label="Reduced events" description="Disables high-frequency cosmetic events (lighting updates, particles, sounds, explosions) to save compute." value={bot.reduced_events === true} onChange={(reduced_events) => patchBot({ reduced_events })} />
      </SettingsGroup>
      <InlineError message={errors.behavior} />
    </>
  );
}

export function ScriptsPage({ automation, setAutomation, errors }: DraftProps) {
  return (
    <>
      <SettingsGroup title="Execution">
        <Field label="Delay between actions (ms)" value={String(automation.delay_between_actions ?? "")} onChangeText={(value) => setAutomation((item) => ({ ...item, delay_between_actions: Number(value) || value }))} keyboardType="number-pad" />
        <Toggle label="Optimize script memory" description="Reduces memory usage for scripts at the cost of compute performance." value={automation.worker_optimize_for_size === true} onChange={(value) => setAutomation((item) => ({ ...item, worker_optimize_for_size: value }))} />
      </SettingsGroup>
      <InlineError message={errors.scripts} />
    </>
  );
}

export function ProxiesPage({ proxy, setProxy, errors }: DraftProps) {
  return (
    <>
      <SettingsGroup title="Rotating proxy pool" footer="Each bot connection goes through the next SOCKS proxy in this profile’s pool.">
        <ProxyEditor value={proxy} onChange={setProxy} />
      </SettingsGroup>
      <InlineError message={errors.proxies} />
    </>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  error: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.sm, borderRadius: 10, backgroundColor: colors.dangerSoft },
  errorText: { flex: 1, color: colors.danger },
});
