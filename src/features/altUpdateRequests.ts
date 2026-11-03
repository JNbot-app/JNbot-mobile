import type {
  AltUpdateData,
  AltUpdateRequestPayload,
} from "../generated/client-contract/mobileClientContract";
import type { AltWithData, JNdata } from "../store/types";

export type AltUpdateField = "remove" | "password" | "rank" | "gkit";

export type AltUpdateReviewRow = {
  id: string;
  username: string;
  action: "add" | "update" | "remove";
  field: AltUpdateField;
  gamemode?: string;
  label: string;
  current: string;
  next: string;
  error?: string;
  noop?: boolean;
};

const idFor = (username: string, field: AltUpdateField, gamemode?: string) =>
  `${username}::${field}${gamemode ? `::${gamemode}` : ""}`;

const same = (a: string[] = [], b: string[] = []) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

export function buildAltUpdateReview(
  request: AltUpdateRequestPayload,
  alts: AltWithData[],
  jndata: JNdata | null,
  profileKey: string | null,
): AltUpdateReviewRow[] {
  const rows: AltUpdateReviewRow[] = [];
  const profile = profileKey ? jndata?.servers?.[profileKey] ?? {} : {};
  const altByName = new Map(
    alts.map((alt) => [alt.username.toLowerCase(), alt] as const),
  );

  for (const [username, update] of Object.entries(request.updates)) {
    const currentAlt = altByName.get(username.toLowerCase());
    const usernameError = /^[A-Za-z0-9_]{3,16}$/.test(username)
      ? undefined
      : "Use a Minecraft username with 3–16 letters, numbers, or underscores.";
    if (update === null) {
      if (currentAlt)
        rows.push({
          id: idFor(username, "remove"),
          username,
          action: "remove",
          field: "remove",
          label: "Remove account",
          current: "In this profile",
          next: "Removed",
          error: usernameError,
        });
      continue;
    }

    const action = currentAlt ? "update" : "add";
    if (!currentAlt && !(typeof update.password === "string" && update.password)) {
      rows.push({
        id: idFor(username, "password"),
        username,
        action,
        field: "password",
        label: "Password",
        current: "Not set",
        next: "Missing",
        error: usernameError ?? "A password is required to add this account.",
      });
    } else if (Object.prototype.hasOwnProperty.call(update, "password")) {
      const password = update.password ?? "";
      const unchanged = currentAlt?.data?.password === password;
      rows.push({
        id: idFor(username, "password"),
        username,
        action,
        field: "password",
        label: "Password",
        current: currentAlt?.data?.password ? "••••••••" : "Not set",
        next: password ? "•".repeat(Math.min(password.length, 10)) : "Empty",
        error: usernameError ?? (!password
          ? "The password cannot be empty."
          : password.length > 45
            ? "The password cannot exceed 45 characters."
            : undefined),
        noop: unchanged,
      });
    }

    for (const [gamemode, rank] of Object.entries(update.ranks ?? {})) {
      const config = profile?.[gamemode.toLowerCase()];
      const current = currentAlt?.data?.ranks?.[gamemode];
      const known = rank === null || Boolean(config?.ranks?.[rank]);
      rows.push({
        id: idFor(username, "rank", gamemode),
        username,
        action,
        field: "rank",
        gamemode,
        label: `Rank · ${gamemode}`,
        current: current ?? "—",
        next: rank ?? "Remove",
        error: usernameError ?? (!config
          ? `Unknown gamemode “${gamemode}”.`
          : !known
            ? `Unknown rank “${rank}”.`
            : undefined),
        noop: current === (rank ?? undefined),
      });
    }

    for (const [gamemode, names] of Object.entries(update.gkits ?? {})) {
      const config = profile?.[gamemode.toLowerCase()];
      const available = config?.gkits ?? {};
      const invalid = names.find((name) => !available[name]);
      const current = currentAlt?.data?.gkits?.[gamemode] ?? [];
      rows.push({
        id: idFor(username, "gkit", gamemode),
        username,
        action,
        field: "gkit",
        gamemode,
        label: `GKits · ${gamemode}`,
        current: current.length ? current.join(", ") : "—",
        next: names.length ? names.join(", ") : "None",
        error: usernameError ?? (!config
          ? `Unknown gamemode “${gamemode}”.`
          : invalid
            ? `Unknown GKit “${invalid}”.`
            : undefined),
        noop: same(current, names),
      });
    }
  }

  return rows;
}

export const defaultApprovedFieldIds = (rows: AltUpdateReviewRow[]) =>
  new Set(rows.filter((row) => !row.error && !row.noop).map((row) => row.id));

export function buildApprovedAltUpdates(
  request: AltUpdateRequestPayload,
  rows: AltUpdateReviewRow[],
  approved: Set<string>,
): AltUpdateRequestPayload["updates"] {
  const output: Record<string, AltUpdateData | null> = {};
  for (const row of rows) {
    if (!approved.has(row.id) || row.error || row.noop) continue;
    const source = request.updates[row.username];
    if (row.field === "remove") {
      output[row.username] = null;
      continue;
    }
    if (!source) continue;
    const target = (output[row.username] ??= {}) as AltUpdateData;
    if (row.field === "password") target.password = source.password;
    if (row.field === "rank" && row.gamemode) {
      (target.ranks ??= {})[row.gamemode] =
        source.ranks?.[row.gamemode] ?? null;
    }
    if (row.field === "gkit" && row.gamemode) {
      (target.gkits ??= {})[row.gamemode] =
        source.gkits?.[row.gamemode] ?? [];
    }
  }
  return output;
}
