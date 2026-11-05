import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Screen } from '../../../src/components/Screen';
import { ScreenSafeArea } from '../../../src/components/ScreenSafeArea';
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Button,
  Card,
  EmptyState,
  Txt,
} from "../../../src/components/ui";
import { ChatMessage, ChatPartSheet, useChatClickHandler } from "../../../src/components/bot/ChatMessage";
import { MinecraftInventory } from "../../../src/components/bot/MinecraftInventory";
import { BotWorldMap } from "../../../src/components/bot/BotWorldMap";
import { BotTriggers } from "../../../src/components/bot/BotTriggers";
import { BotMovement } from "../../../src/components/bot/BotMovement";
import { MouseControls } from "../../../src/components/bot/MouseControls";
import {
  BOT_DETAIL_TABS,
  BotDetailHeader,
  BotDetailTabBar,
  DEFAULT_BOT_DETAIL_TAB,
  type BotDetailTab,
} from "../../../src/components/bot/BotDetailChrome";
import { ScriptControl, useCommands } from "../../../src/hooks/useCommands";
import { useClient } from "../../../src/net/ConnectionProvider";
import {
  isBotAssignedToScript,
  selectCanUseActiveBots,
  selectCanUseScripts,
  selectConnectedBotById,
  useStore,
} from "../../../src/store/store";
import type { InventoryPacket } from "../../../src/features/inventory";
import { chatLineText, completionMatches, type ChatLine, type ChatPart } from "../../../src/features/chat";
import { ChatComposer } from "../../../src/components/bot/ChatComposer";
import { colors, font, radii, spacing, palette } from "../../../src/theme/theme";
import { NativeIcon } from "../../../src/components/NativeIcon";
import { useSafeBack } from "../../../src/hooks/useSafeBack";
import type { JNbotClient } from "../../../src/client/JNbotClient";
import type { ActiveBot } from "../../../src/store/types";
import type { BotAction } from "../../../src/generated/client-contract/mobileClientContract";
import { Choice, PickerField } from "../../../src/components/PickerField";

type ScriptAction = {
  actionId?: string;
  id?: string;
  action?: string;
  name?: string;
  scriptId?: string;
  pluginId?: string;
  scriptInstance?: string;
  description?: string;
};
const EMPTY_STRINGS: string[] = [];
const EMPTY_CHAT: ChatLine[] = [];
const BOT_TABS = BOT_DETAIL_TABS.map((item) => item.id);

export default function BotDetail() {
  const goBack = useSafeBack("/(app)/bots");
  const router = useRouter();
  const client = useClient();
  const commands = useCommands();
  const { botId, tab: initialTab } = useLocalSearchParams<{
    botId: string;
    tab?: BotDetailTab;
  }>();
  const id = Number(botId);
  const canUseActiveBots = useStore(selectCanUseActiveBots);
  const canUseScripts = useStore(selectCanUseScripts);
  const bot = useStore(selectConnectedBotById(id));
  const chat = useStore((s) => s.botChats[id] ?? EMPTY_CHAT);
  const inventory = useStore(
    (s) => s.botInventories[id] as InventoryPacket | undefined,
  );
  const info = useStore((s) => s.botInfo[id]);
  const movement = useStore((s) => s.botMovement[id]);
  const activeScripts = useStore((s) => s.activeScripts);
  const activeScriptActions = useStore((s) => s.activeScriptActions);
  const installedMacros = useStore((s) => s.macros.list);
  const jndata = useStore((s) => s.JNdata);
  const settings = useStore((s) => s.settings);
  const profileKey = useStore((s) => s.activeProfileKey);
  const connectionState = useStore((s) => s.connectionState);
  const gamemodes =
    jndata?.data?.[profileKey ?? ""]?.gamemodes ?? EMPTY_STRINGS;
  const [tab, setTab] = useState<BotDetailTab>(
    initialTab && BOT_TABS.includes(initialTab)
      ? initialTab
      : DEFAULT_BOT_DETAIL_TAB,
  );

  useEffect(() => {
    if (
      initialTab &&
      BOT_TABS.includes(initialTab)
    ) {
      setTab(initialTab);
    }
  }, [initialTab]);
  const [message, setMessage] = useState("");
  const [scriptActions, setScriptActions] = useState<ScriptAction[]>([]);
  const [selectedAction, setSelectedAction] = useState("");
  const [actionArgument, setActionArgument] = useState("");
  const [gamemode, setGamemode] = useState(gamemodes[0] ?? "");
  const connected = !!bot?.MESSAGE_ADDRESS;
  const parentScript = bot
    ? Object.values(activeScripts).find((script) =>
      isBotAssignedToScript(bot, script),
    )
    : undefined;

  const actionChoices = useMemo<Choice[]>(() => {
    const choices: Choice[] = [];
    const seen = new Set<string>();

    const activeList = [
      ...scriptActions,
      ...(parentScript ? activeScriptActions[String(parentScript.instanceId)] ?? [] : []),
    ];

    for (const action of activeList) {
      const value = action.actionId || action.id || action.action;
      if (!value || seen.has(value)) continue;
      seen.add(value);

      const matchedMacro = installedMacros.find(
        (m) =>
          m.id === value ||
          m.pluginId === (action.pluginId || action.scriptId) ||
          m.name === (action.name || action.action),
      );

      const label =
        action.name ||
        action.action ||
        matchedMacro?.name ||
        action.actionId ||
        action.id ||
        "Action";
      const description =
        action.description || matchedMacro?.description || undefined;

      choices.push({
        label,
        value,
        description,
      });
    }

    for (const macro of installedMacros) {
      if (macro.scriptType === "action") {
        const value = macro.id || macro.pluginId;
        if (!value || seen.has(value)) continue;
        seen.add(value);
        choices.push({
          label: macro.name || value,
          value,
          description: macro.description || undefined,
        });
      }
    }

    return choices;
  }, [scriptActions, parentScript, activeScriptActions, installedMacros]);
  useEffect(() => {
    if (!bot && connectionState === "connected") router.replace("/(app)/bots");
  }, [bot, connectionState, router]);
  useEffect(() => {
    if (!client || !bot || !connected) return;
    if (tab === "map" || tab === "triggers" || tab === "actions") return;
    const event =
      tab === "chat"
        ? "chat"
        : tab === "inventory"
          ? "inventory"
          : tab === "movement"
            ? "movement-state"
            : "info";
    return client.subscribeBot(bot, event, () => undefined);
  }, [client, bot?.botId, bot?.MESSAGE_ADDRESS, tab, connected, connectionState]);
  useEffect(() => {
    if (!client || tab !== "actions") return;
    void client
      .profileAction<ScriptAction[]>("GET_SCRIPT_ACTIONS")
      .then((result) => setScriptActions(Array.isArray(result) ? result : []))
      .catch(() => setScriptActions([]));
  }, [client, tab]);
  if (!canUseActiveBots) {
    return (
      <Screen back onBack={goBack} title="Bot">
        <EmptyState
          icon={<Ionicons name="lock-closed-outline" size={48} color={colors.textFaint} />}
          title="Active bots disabled"
          subtitle="Your remote access link does not have permission to view or control active bots."
        />
      </Screen>
    );
  }

  if (!bot) return null;
  const sendChat = () => {
    if (message.trim() && connected) {
      void client?.botAction(bot, "chatMessage", [message.trim()]);
      setMessage("");
    }
  };
  const leave = () => {
    void client?.botAction(bot, "leave");
  };
  const stop = () => {
    if (parentScript) {
      commands?.stopScript(parentScript.instanceId);
    }
  };
  const botAction = (action: BotAction, data?: unknown[]) =>
    client?.botAction(bot, action, data);
  const scriptControls = parentScript?.controls ?? 0;
  const toggleControl = scriptControls & ScriptControl.PAUSE
    ? { label: "Pause" as const, control: ScriptControl.PAUSE }
    : scriptControls & ScriptControl.RESUME
      ? { label: "Resume" as const, control: ScriptControl.RESUME }
      : undefined;
  const controllableScript = connected ? parentScript : undefined;
  return (
    <ScreenSafeArea style={styles.safe} edges={["top", "bottom", "left", "right"]}>
      <BotDetailHeader
        bot={bot}
        scriptName={controllableScript?.name}
        canControl={canUseScripts}
        canLeave={connected}
        toggleLabel={toggleControl?.label}
        onBack={goBack}
        onToggle={
          controllableScript && toggleControl
            ? () => commands?.sendControl(controllableScript.instanceId, toggleControl.control)
            : undefined
        }
        onStop={controllableScript ? stop : undefined}
        onLeave={leave}
      />
      <BotDetailTabBar
        activeTab={tab}
        connected={connected}
        onChange={setTab}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {tab === "chat" ? (
          <View style={styles.chatScreen}>
            {!connected ? (
              <View style={styles.notice}>
                <Txt variant="muted">
                  Controls become available when this worker bot is connected.
                </Txt>
              </View>
            ) : null}
            <Chat
              messages={chat}
              value={message}
              onChange={setMessage}
              onSend={sendChat}
              onCommand={(command) => void client?.botAction(bot, "chatMessage", [command])}
              onComplete={async (text) =>
                completionMatches(await client?.botAction(bot, "tabComplete", [text], true))}
              disabled={!connected}
            />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {!connected ? (
              <View style={styles.notice}>
                <Txt variant="muted">
                  Controls become available when this worker bot is connected.
                </Txt>
              </View>
            ) : null}
            {tab === "inventory" ? (
              <MinecraftInventory
                inventory={inventory}
                disabled={!connected}
                onAction={botAction}
              />
            ) : null}

            {tab === "actions" ? (
              <Actions
                bot={bot}
                client={client}
                connected={connected}
                gamemodes={gamemodes}
                gamemode={gamemode}
                setGamemode={setGamemode}
                actionChoices={actionChoices}
                selectedAction={selectedAction}
                setSelectedAction={setSelectedAction}
                argument={actionArgument}
                setArgument={setActionArgument}
                onAction={botAction}
              />
            ) : null}

            {tab === "movement" ? (
              <BotMovement
                key={bot.MESSAGE_ADDRESS}
                connected={connected}
                movement={movement}
                onAction={botAction}
              />
            ) : null}
            {tab === "map" && client ? (
              <BotWorldMap bot={bot} client={client} disabled={!connected} />
            ) : null}
            {tab === "triggers" && client ? (
              <BotTriggers
                bot={bot}
                client={client}
                settings={settings}
              />
            ) : null}
            {tab === "info" ? <Info bot={bot} info={info} /> : null}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </ScreenSafeArea>
  );
}

function Chat({
  messages,
  value,
  onChange,
  onSend,
  onCommand,
  onComplete,
  disabled,
}: {
  messages: ChatLine[];
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onCommand: (command: string) => void;
  onComplete: (text: string) => Promise<string[]>;
  disabled: boolean;
}) {
  const scrollRef = useRef<ScrollView>(null);
  // Whether the view follows new messages; only cleared when the user scrolls up.
  const isAtBottomRef = useRef(true);
  const lastOffsetRef = useRef(0);
  const isInitialMount = useRef(true);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [selectedPart, setSelectedPart] = useState<ChatPart | null>(null);
  const handleClick = useChatClickHandler(onCommand, onChange);
  const handlePartPress = (part: ChatPart) => {
    if (part.hover) setSelectedPart(part);
    else if (part.click) handleClick(part.click);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    if (contentSize.height <= layoutMeasurement.height) {
      isAtBottomRef.current = true;
      if (isScrolledUp) setIsScrolledUp(false);
      return;
    }
    const distanceFromBottom =
      contentSize.height - (contentOffset.y + layoutMeasurement.height);
    // Content growth or an animated scrollToEnd never moves the offset up, so
    // only an upward scroll detaches the view from the bottom.
    if (distanceFromBottom <= 40) isAtBottomRef.current = true;
    else if (contentOffset.y < lastOffsetRef.current) isAtBottomRef.current = false;
    lastOffsetRef.current = contentOffset.y;
    if (isScrolledUp !== !isAtBottomRef.current) {
      setIsScrolledUp(!isAtBottomRef.current);
    }
  };

  const handleContentSizeChange = () => {
    if (isAtBottomRef.current) {
      const animated = !isInitialMount.current;
      scrollRef.current?.scrollToEnd({ animated });
      isInitialMount.current = false;
    }
  };

  const handleSend = () => {
    if (!value.trim() || disabled) return;
    isAtBottomRef.current = true;
    setIsScrolledUp(false);
    onSend();
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  const scrollToBottom = () => {
    isAtBottomRef.current = true;
    setIsScrolledUp(false);
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <View style={styles.chat}>
      <Card style={styles.chatCard}>
        {messages.length ? (
          <ScrollView
            ref={scrollRef}
            style={styles.chatMessages}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={handleContentSizeChange}
            showsVerticalScrollIndicator={true}
          >
            {messages.map((item, index) => (
              <ChatMessage
                key={`${index}-${chatLineText(item)}`}
                line={item}
                style={styles.chatLine}
                onPress={handlePartPress}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.chatEmpty}>
            <NativeIcon sf="bubble.left.and.bubble.right" material="chat-bubble-outline" size={28} color={colors.textFaint} />
            <Txt variant="muted">No chat received yet</Txt>
          </View>
        )}
        {isScrolledUp ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scroll to latest messages"
            onPress={scrollToBottom}
            style={styles.scrollToBottomBtn}
          >
            <Ionicons name="arrow-down" size={13} color={colors.text} />
            <Txt variant="faint" style={styles.scrollToBottomText}>
              Latest
            </Txt>
          </Pressable>
        ) : null}
      </Card>
      <ChatPartSheet
        part={selectedPart}
        onClose={() => setSelectedPart(null)}
        onClick={handleClick}
      />
      <ChatComposer
        value={value}
        onChange={onChange}
        onSend={handleSend}
        complete={onComplete}
        disabled={disabled}
      />
    </View>
  );
}
function Actions({
  bot,
  client,
  connected,
  gamemodes,
  gamemode,
  setGamemode,
  actionChoices,
  selectedAction,
  setSelectedAction,
  argument,
  setArgument,
  onAction,
}: {
  bot: ActiveBot;
  client: JNbotClient | null;
  connected: boolean;
  gamemodes: string[];
  gamemode: string;
  setGamemode: (val: string) => void;
  actionChoices: Choice[];
  selectedAction: string;
  setSelectedAction: (val: string) => void;
  argument: string;
  setArgument: (val: string) => void;
  onAction: (action: BotAction, data?: unknown[]) => void;
}) {
  const selectedChoice = actionChoices.find((opt) => opt.value === selectedAction);
  const gamemodeChoices = useMemo<Choice[]>(
    () => gamemodes.map((mode) => ({ label: mode, value: mode })),
    [gamemodes]
  );

  return (
    <View style={styles.panel}>
      <Txt variant="label">Join gamemode</Txt>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <PickerField
            title="Join gamemode"
            placeholder={gamemodeChoices.length ? "Select gamemode" : "No gamemodes"}
            options={gamemodeChoices}
            value={gamemode}
            freeSolo
            clearable
            onChange={(next) =>
              setGamemode(typeof next === "string" ? next : "")
            }
          />
        </View>
        <Button
          title="Join"
          small
          disabled={!connected || !gamemode}
          onPress={() => onAction("joinGamemode", [gamemode])}
        />
      </View>
      <Txt variant="label">Script action</Txt>
      {actionChoices.length ? (
        <View style={{ gap: spacing.xs }}>
          <PickerField
            title="Script action"
            placeholder="Select a script action"
            options={actionChoices}
            value={selectedAction}
            clearable
            onChange={(next) =>
              setSelectedAction(typeof next === "string" ? next : "")
            }
          />
          {selectedChoice?.description ? (
            <Txt variant="faint" style={{ marginTop: 2 }}>
              {selectedChoice.description}
            </Txt>
          ) : null}
        </View>
      ) : (
        <Txt variant="muted">This script does not expose any actions.</Txt>
      )}
      <TextInput
        value={argument}
        onChangeText={setArgument}
        placeholder="Optional argument"
        placeholderTextColor={colors.textFaint}
        style={styles.messageInput}
      />
      <Button
        title="Run action"
        variant="secondary"
        disabled={!connected || !selectedAction}
        onPress={() =>
          onAction("runScriptAction", [{ id: selectedAction, arg: argument }])
        }
      />
      <Txt variant="label">Quick actions</Txt>
      <View style={styles.quick}>
        {(
          [
            ["Auth", "login"],
            ["Eat", "eat"],
            ["Use item", "activateItem"],
            ["Close window", "closeWindow"],
          ] as Array<[string, BotAction]>
        ).map(([label, action]) => (
          <Button
            key={action}
            title={label}
            small
            variant="secondary"
            disabled={!connected}
            onPress={() => onAction(action)}
          />
        ))}
      </View>
      {client ? (
        <>
          <Txt variant="label">Mouse</Txt>
          <MouseControls bot={bot} client={client} disabled={!connected} />
        </>
      ) : null}
    </View>
  );
}
function Info({ bot, info }: any) {
  const fields = [
    ["Health", info?.health === undefined ? "—" : `${info.health}/20`],
    ["Hunger", info?.hunger === undefined ? "—" : `${info.hunger}/20`],
    ["Ping", info?.ping === undefined ? "—" : `${info.ping} ms`],
    ["Gamemode", info?.gamemode ?? "—"],
    [
      "Position",
      info?.position
        ? `${info.position.x}, ${info.position.y}, ${info.position.z}`
        : "—",
    ],
    ["UUID", info?.uuid ?? bot.uuid ?? "—"],
    ["Script", bot.SCRIPT_NAME || bot.script || "—"],
    ["Host", bot.host ? `${bot.host}:${bot.port}` : "—"],
    ["Bot ID", String(bot.botId)],
  ];
  return (
    <Card style={{ gap: 0 }}>
      {fields.map(([label, value], index) => (
        <View
          key={label}
          style={[
            styles.info,
            index === fields.length - 1 && { borderBottomWidth: 0 },
          ]}
        >
          <Txt variant="muted" style={{ flex: 1 }}>
            {label}
          </Txt>
          <Txt
            numberOfLines={1}
            style={{ maxWidth: "65%", textAlign: "right" }}
          >
            {value}
          </Txt>
        </View>
      ))}
    </Card>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  chatScreen: { flex: 1, gap: spacing.md, padding: spacing.lg },
  notice: {
    padding: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
  },
  chatEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  chatCard: {
    flex: 1,
    padding: spacing.sm,
    position: "relative",
    overflow: "hidden",
  },
  chat: { flex: 1, gap: spacing.sm },
  chatMessages: { flex: 1 },
  chatLine: {
    fontSize: font.size.caption,
    lineHeight: 20,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
  },
  scrollToBottomBtn: {
    position: "absolute",
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollToBottomText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 12,
  },
  messageInput: {
    color: colors.text,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  panel: { gap: spacing.md },
  quick: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  info: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
});
