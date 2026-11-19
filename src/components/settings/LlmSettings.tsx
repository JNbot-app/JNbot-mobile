import React, { useEffect, useState } from "react";
import { Linking, StyleSheet, TextInput, View } from "react-native";
import { Badge, Button, Txt } from "../ui";
import { PickerField } from "../PickerField";
import { useFeedback } from "../AppFeedback";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { refreshLlmStatus } from "../../hooks/useLlm";
import { useConnection } from "../../net/ConnectionProvider";
import { LLM_PROVIDERS, llmProvider, type LlmProviderId, type LlmStatus } from "../../generated/client-contract/llm";
import { colors, radii, spacing } from "../../theme/theme";

const providerOptions = LLM_PROVIDERS.map(({ id, label, note }) => ({ value: id, label, description: note }));

/** The provider's live model list for the chosen provider + key (or the saved key). */
function useModels(provider: LlmProviderId, apiKey: string, canList: boolean) {
  const { client } = useConnection();
  const [models, setModels] = useState<string[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setModels([]);
    setError(undefined);
    if (!client || !canList) return undefined;
    let active = true;
    // Wait until the user stops typing the key.
    const timer = setTimeout(() => {
      client
        .llm<string[]>("LLM_MODELS", { provider, apiKey: apiKey || undefined })
        .then((list) => active && setModels(list))
        .catch((reason) => active && setError(reason instanceof Error ? reason.message : String(reason)));
    }, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [client, provider, apiKey, canList]);

  return { models, error };
}

/** Settings: pick the desktop's AI provider, paste a key and choose a model. */
export function LlmSettings() {
  const { client } = useConnection();
  const { showMessage } = useFeedback();
  const { busy, run } = useAsyncAction();
  const [status, setStatus] = useState<LlmStatus>({ configured: false });
  const [provider, setProvider] = useState<LlmProviderId>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState<string>();
  const info = llmProvider(provider);
  const savedHere = status.provider === provider;
  // A saved key is reused while the provider stays the same.
  const hasKey = !info.keyUrl || Boolean(apiKey) || savedHere;
  const { models, error } = useModels(provider, apiKey, hasKey);

  useEffect(() => {
    if (!client) return;
    void refreshLlmStatus(client).then((next) => {
      setStatus(next);
      if (next.provider) setProvider(next.provider);
      setModel(next.model);
    });
  }, [client]);

  // Keep the choice valid for the loaded list: the saved model, else the first.
  useEffect(() => {
    if (models.length && !(model && models.includes(model)))
      setModel(savedHere && status.model && models.includes(status.model) ? status.model : models[0]);
  }, [models]);

  const reload = async () => {
    if (client) setStatus(await refreshLlmStatus(client));
  };

  const changeProvider = (next: unknown) => {
    setProvider(next as LlmProviderId);
    setApiKey("");
    setModel(undefined);
  };

  const save = () =>
    run(async () => {
      await client?.llm("LLM_SET_CONFIG", { provider, model, apiKey: apiKey || undefined });
      setApiKey("");
      await reload();
    }, "AI settings saved");

  const test = () => run(async () => showMessage(String(await client?.llm("LLM_TEST")), "success"));

  const remove = () =>
    run(async () => {
      await client?.llm("LLM_SET_CONFIG", null);
      await reload();
    }, "AI settings removed");

  return (
    <View style={{ gap: spacing.md }}>
      {status.configured ? (
        <View style={styles.statusRow}>
          <Badge label="On" color={colors.success} />
          <Txt variant="muted">
            {llmProvider(status.provider).label} · {status.model}
          </Txt>
        </View>
      ) : null}
      <View style={{ gap: spacing.xs }}>
        <Txt variant="label">Provider</Txt>
        <PickerField title="Provider" options={providerOptions} value={provider} onChange={changeProvider} />
      </View>
      {info.keyUrl ? (
        <View style={{ gap: spacing.xs }}>
          <Txt variant="label">API key</Txt>
          <TextInput
            value={apiKey}
            onChangeText={(text) => setApiKey(text.replace(/\s+/g, "").replace(/^bearer/i, ""))}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={savedHere ? "Saved. Paste a new key to replace it." : "Paste your key"}
            placeholderTextColor={colors.textFaint}
            style={styles.input}
          />
          <Txt variant="faint" style={{ color: colors.primary }} onPress={() => void Linking.openURL(info.keyUrl!)}>
            Get a {info.label.split(" ")[0]} key
          </Txt>
        </View>
      ) : null}
      <View style={{ gap: spacing.xs }}>
        <Txt variant="label">Model</Txt>
        <PickerField
          title="Model"
          options={models.map((id) => ({ value: id, label: id }))}
          value={model}
          onChange={(next) => setModel(next as string)}
          placeholder={hasKey ? "Choose a model" : "Add a key to see the models"}
        />
        {error ? <Txt variant="faint" style={{ color: colors.danger }}>{error}</Txt> : null}
      </View>
      <View style={styles.actions}>
        <Button title="Save" small loading={busy} disabled={!hasKey || !model} onPress={() => void save()} />
        {status.configured ? (
          <>
            <Button title="Test" small variant="secondary" loading={busy} onPress={() => void test()} />
            <Button title="Remove" small variant="danger" loading={busy} onPress={() => void remove()} />
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
