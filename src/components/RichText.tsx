import React, { memo, useMemo } from "react";
import { Text, type TextProps, type TextStyle } from "react-native";
import Anser from "anser";

type AnsiChunk = {
  content?: string;
  fg?: string | null;
  bg?: string | null;
  decoration?:
    | "bold"
    | "dim"
    | "italic"
    | "underline"
    | "strikethrough"
    | null;
};

const legacyCodes: Record<string, string> = {
  "0": "\x1b[30m",
  "1": "\x1b[34m",
  "2": "\x1b[32m",
  "3": "\x1b[36m",
  "4": "\x1b[31m",
  "5": "\x1b[35m",
  "6": "\x1b[33m",
  "7": "\x1b[37m",
  "8": "\x1b[90m",
  "9": "\x1b[94m",
  a: "\x1b[92m",
  b: "\x1b[96m",
  c: "\x1b[91m",
  d: "\x1b[95m",
  e: "\x1b[93m",
  f: "\x1b[97m",
  l: "\x1b[1m",
  m: "\x1b[9m",
  n: "\x1b[4m",
  o: "\x1b[3m",
  r: "\x1b[0m",
};

export function minecraftToAnsi(input: string) {
  const text = String(input ?? "");
  let output = "";
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "§" || index + 1 >= text.length) {
      output += text[index];
      continue;
    }
    const code = text[index + 1].toLowerCase();
    if (code === "x") {
      const sequence = text.slice(index + 2, index + 14);
      const matches = [...sequence.matchAll(/§([0-9a-f])/gi)];
      if (matches.length === 6) {
        const hex = matches.map((match) => match[1]).join("");
        const red = Number.parseInt(hex.slice(0, 2), 16);
        const green = Number.parseInt(hex.slice(2, 4), 16);
        const blue = Number.parseInt(hex.slice(4, 6), 16);
        output += `\x1b[38;2;${red};${green};${blue}m`;
        index += 13;
        continue;
      }
    }
    if (code === "k") {
      index += 1;
      continue;
    }
    const ansi = legacyCodes[code];
    if (ansi) {
      output += ansi;
      index += 1;
      continue;
    }
    output += text[index];
  }
  return output;
}

export function parseRichText(input: string): AnsiChunk[] {
  const text = minecraftToAnsi(input);
  try {
    return Anser.ansiToJson(text) as AnsiChunk[];
  } catch {
    return [{ content: text.replace(/\x1b\[[0-9;]*m/g, "") }];
  }
}

const color = (value?: string | null) =>
  value ? `rgb(${value})` : undefined;

const decoration = (value: AnsiChunk["decoration"]): TextStyle => {
  if (value === "bold") return { fontWeight: "700" };
  if (value === "dim") return { opacity: 0.72 };
  if (value === "italic") return { fontStyle: "italic" };
  if (value === "underline") return { textDecorationLine: "underline" };
  if (value === "strikethrough")
    return { textDecorationLine: "line-through" };
  return {};
};

export const RichText = memo(function RichText({
  children,
  style,
  ...props
}: Omit<TextProps, "children"> & { children: string }) {
  const chunks = useMemo(() => parseRichText(children), [children]);
  return (
    <Text {...props} style={style}>
      {chunks.map((chunk, index) =>
        chunk.content ? (
          <Text
            key={`${index}-${chunk.content}`}
            style={{
              color: color(chunk.fg),
              backgroundColor: color(chunk.bg),
              ...decoration(chunk.decoration),
            }}
          >
            {chunk.content}
          </Text>
        ) : null,
      )}
    </Text>
  );
});
