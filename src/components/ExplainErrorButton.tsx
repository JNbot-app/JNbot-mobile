import { Alert } from "react-native";
import { useAsyncAction } from "../hooks/useAsyncAction";
import { useLlm } from "../hooks/useLlm";
import { useClient } from "../net/ConnectionProvider";
import { Button } from "./ui";

/** "Explain" on an error log line, like the desktop console. Hidden until AI is set up. */
export function ExplainErrorButton({ error, scriptName }: { error: string; scriptName?: string }) {
  const client = useClient();
  const { configured } = useLlm();
  const { busy, run } = useAsyncAction();
  if (!configured || !client) return null;

  const explain = () =>
    run(async () => {
      const answer = await client.llm<string>("LLM_EXPLAIN_ERROR", { error, scriptName });
      // Alerts show plain text, so drop the markdown markers.
      Alert.alert("What went wrong", answer.replace(/[*_`#]/g, ""));
    });

  return <Button title="Explain" variant="secondary" small loading={busy} onPress={explain} style={{ alignSelf: "flex-start" }} />;
}
