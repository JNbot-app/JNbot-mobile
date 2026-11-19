import React from "react";
import { LlmPrompt, type LlmPromptProps } from "../LlmPrompt";
import type { ShareOverview, SharePreview } from "../../generated/client-contract/share";

/** Ask the AI how a marketplace item works, from its description and code. */
export function ShareAskAi({
  overview,
  load,
}: {
  overview: ShareOverview;
  /** The full preview (with code), downloaded on the first question. */
  load: () => Promise<SharePreview | null | undefined>;
}) {
  const ask: LlmPromptProps["onSubmit"] = async (question, run) => {
    const preview = await load();
    const content = JSON.stringify(
      preview
        ? {
            details: preview.details,
            plugins: preview.plugins.map(({ name, description, scriptType, code }) => ({ name, description, scriptType, code })),
          }
        : overview,
    );
    await run({ event: "LLM_ASK_SHARE", input: { question, title: overview.title, description: overview.description, content } });
  };

  return (
    <LlmPrompt
      placeholder="Ask how this works, e.g. does it need a pickaxe?"
      button="Ask"
      examples={["What does it need to work?", "Is it safe to run?", "Which settings matter most?"]}
      onSubmit={ask}
    />
  );
}
