import { View } from "react-native";
import { useLlm } from "../hooks/useLlm";
import { useLlmRun } from "../hooks/useLlmRun";
import { spacing } from "../theme/theme";
import { LlmActivity } from "./LlmActivity";
import { Button } from "./ui";

/** "Explain" on an error log line, like the desktop console: streams the answer inline. Hidden until AI is set up. */
export function ExplainErrorButton({ error, scriptName }: { error: string; scriptName?: string }) {
  const { configured } = useLlm();
  const ai = useLlmRun();
  if (!configured) return null;

  return (
    <View style={{ gap: spacing.sm }}>
      {!ai.startedAt ? (
        <Button
          title="Explain"
          variant="secondary"
          small
          onPress={() => void ai.run({ event: "LLM_EXPLAIN_ERROR", input: { error, scriptName } })}
          style={{ alignSelf: "flex-start" }}
        />
      ) : null}
      <LlmActivity run={ai} onDismiss={ai.reset} />
    </View>
  );
}
