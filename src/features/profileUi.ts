import type {
  ProfileUiJson,
  ProfileUiSection,
} from "../generated/client-contract/profileUiSchema";

/** Mirrors `ProfileUiRunResponse` from the desktop `ProfileUiRunner`. */
export type ProfileUiRunResponse =
  | { ok: true; json: ProfileUiJson }
  | { ok: false; reason: "no-action" | "error"; error?: string };

/**
 * Visible sections in single-column order: the left column, then the right —
 * the same stacking desktop uses when its panel is too narrow for two columns.
 */
export function profileUiSections(json: ProfileUiJson): ProfileUiSection[] {
  const visible = json.sections.filter((section) => section.visible !== false);
  return [
    ...visible.filter((section) => section.column !== "right"),
    ...visible.filter((section) => section.column === "right"),
  ];
}
