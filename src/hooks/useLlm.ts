import { useEffect, useState } from "react";
import type { LlmStatus } from "../generated/client-contract/llm";
import type { JNbotClient } from "../client/JNbotClient";
import { useClient } from "../net/ConnectionProvider";

const NOT_SET_UP: LlmStatus = { configured: false };
// One status request per connection, shared by every screen.
const statuses = new WeakMap<JNbotClient, Promise<LlmStatus>>();

const requestStatus = (client: JNbotClient) => {
  const request = client.llm<LlmStatus>("LLM_STATUS").catch(() => NOT_SET_UP);
  statuses.set(client, request);
  return request;
};

/** Re-reads the status after the settings changed, so screens opened later see it. */
export const refreshLlmStatus = (client: JNbotClient) => requestStatus(client);

/**
 * The backend's optional AI provider. Every AI control checks `configured`,
 * so users without a key never see them.
 */
export function useLlm(): LlmStatus {
  const client = useClient();
  const [status, setStatus] = useState<LlmStatus>(NOT_SET_UP);
  useEffect(() => {
    if (!client) return setStatus(NOT_SET_UP);
    const request = statuses.get(client) ?? requestStatus(client);
    let active = true;
    void request.then((next) => active && setStatus(next));
    return () => {
      active = false;
    };
  }, [client]);
  return status;
}
