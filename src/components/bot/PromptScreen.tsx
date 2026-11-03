import React from "react";
import type { ChatClick } from "../../features/chat";
import type { DialogValue, ScreenPrompt } from "../../features/inventory";
import { BookView } from "./BookView";
import { DialogView } from "./DialogView";
import { SignEditor } from "./SignEditor";

type Props = {
  prompt: ScreenPrompt;
  disabled: boolean;
  onClick: (click: ChatClick) => void;
  onAction: (action: "updateSign" | "dialogAction" | "closePrompt", data?: unknown[]) => void;
};

/** Input screen the server opened; replaces the window like it does in vanilla. */
export function PromptScreen({ prompt, disabled, onClick, onAction }: Props) {
  switch (prompt.kind) {
    case "sign": {
      const { x, y, z } = prompt.position;
      return (
        <SignEditor key={`${x},${y},${z}`} lines={prompt.lines} disabled={disabled} onSubmit={(lines) => onAction("updateSign", [lines])} />
      );
    }
    case "book":
      return <BookView key={prompt.title} book={prompt} onClick={onClick} onClose={() => onAction("closePrompt")} />;
    case "dialog":
      return (
        <DialogView
          key={`${prompt.title}-${JSON.stringify(prompt.inputs)}`}
          dialog={prompt}
          onClick={onClick}
          onButton={(button: number, values: Record<string, DialogValue>) => onAction("dialogAction", [{ button, values }])}
        />
      );
  }
}
