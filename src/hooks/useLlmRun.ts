import { useCallback, useEffect, useRef, useState } from "react";
import type { LlmAskShareInput, LlmGenerateInput, LlmStreamMessage, LlmWritePluginInput } from "../generated/client-contract/llm";
import { useClient } from "../net/ConnectionProvider";

export type LlmRunState = {
  running: boolean;
  /** Progress steps; the last one is current while running. */
  steps: string[];
  thinking: string;
  /** The current reply, streamed. */
  text: string;
  error?: string;
  stopped?: boolean;
  startedAt?: number;
  finishedAt?: number;
};

/** The AI requests the phone makes. `LLM_GENERATE` runs on the current profile. */
export type LlmRunRequest =
  | { event: "LLM_GENERATE"; input: LlmGenerateInput }
  | { event: "LLM_EXPLAIN_ERROR"; input: { error: string; scriptName?: string } }
  | { event: "LLM_WRITE_PLUGIN"; input: Omit<LlmWritePluginInput, "streamId"> }
  | { event: "LLM_ASK_SHARE"; input: Omit<LlmAskShareInput, "streamId"> };

export type LlmRun = LlmRunState & {
  /** Resolves to undefined when the user stopped it or it failed (see `error`). */
  run: <T>(request: LlmRunRequest) => Promise<T | undefined>;
  stop: () => void;
  reset: () => void;
};

const IDLE: LlmRunState = { running: false, steps: [], thinking: "", text: "" };
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** One AI request at a time with live progress, like the desktop's. */
export function useLlmRun(): LlmRun {
  const client = useClient();
  const [state, setState] = useState<LlmRunState>(IDLE);
  const current = useRef<{ streamId: string; stopped: boolean } | null>(null);

  const stop = useCallback(() => {
    const active = current.current;
    if (!active || !client) return;
    active.stopped = true;
    client.llm("LLM_CANCEL", { streamId: active.streamId }).catch(() => undefined);
  }, [client]);

  // Stop a request whose screen went away.
  useEffect(() => stop, [stop]);

  const run = useCallback(
    async <T,>(request: LlmRunRequest): Promise<T | undefined> => {
      if (!client) return undefined;
      const active = { streamId: newId(), stopped: false };
      current.current = active;
      setState({ ...IDLE, running: true, startedAt: Date.now() });
      const update = (change: (previous: LlmRunState) => Partial<LlmRunState>) =>
        current.current === active && setState((previous) => ({ ...previous, ...change(previous) }));
      const unsubscribe = client.onLlmStream((message: LlmStreamMessage) => {
        if (message.streamId !== active.streamId) return;
        if (message.type === "status") update(({ steps }) => ({ steps: [...steps, message.text] }));
        else if (message.type === "thinking") update(({ thinking }) => ({ thinking: thinking + message.delta }));
        else if (message.type === "text") update(({ text }) => ({ text: text + message.delta }));
        else update(({ thinking }) => ({ text: "", thinking: thinking && `${thinking}\n\n` }));
      });
      try {
        const input = { ...request.input, streamId: active.streamId };
        const result =
          request.event === "LLM_GENERATE"
            ? await client.generate<T>(input as LlmGenerateInput)
            : await client.llm<T>(request.event, input);
        update(() => ({ running: false, finishedAt: Date.now() }));
        return result;
      } catch (error) {
        update(() => ({
          running: false,
          finishedAt: Date.now(),
          stopped: active.stopped,
          error: active.stopped ? undefined : error instanceof Error ? error.message : String(error),
        }));
        return undefined;
      } finally {
        unsubscribe();
        if (current.current === active) current.current = null;
      }
    },
    [client],
  );

  const reset = useCallback(() => {
    stop();
    current.current = null;
    setState(IDLE);
  }, [stop]);

  return { ...state, run, stop, reset };
}
