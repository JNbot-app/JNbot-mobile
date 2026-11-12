import { BACKEND } from "../generated/client-contract/messaging/Address";
import type { Messenger } from "../generated/client-contract/messaging/Messenger";
import { PUBLISHER_NAME_REQUIRED, type ShareAction } from "./JNbotRuntime";
import type { PluginImportDecision, PluginImportPreview, PluginImportResult, PortablePluginPackage } from "./types";

/**
 * Backend actions that work the same on the phone runtime and a paired desktop:
 * both run the desktop backend, which decides what a remote device may do.
 */
export async function requestShareAction<T>(messenger: Messenger, event: ShareAction, data: unknown): Promise<T> {
  const result = await messenger.request<
    { status?: string; data?: T; message?: string; identity?: { fingerprint?: string } }
  >("client:action", BACKEND, { event, data });
  if (result?.status === "publisher-name-required") {
    throw Object.assign(new Error(PUBLISHER_NAME_REQUIRED), { fingerprint: result.identity?.fingerprint });
  }
  if (result?.status === "error") throw new Error(result.message || "Share link request failed");
  // SHARE_* actions wrap their result in `data`; state and identity reads do not.
  return (result?.status === "success" && "data" in result ? result.data : result) as T;
}

export function previewPluginImports(
  messenger: Messenger,
  packages: (PortablePluginPackage | string)[],
): Promise<PluginImportPreview[]> {
  return messenger.request("client:action", BACKEND, { event: "PREVIEW_PORTABLE_PLUGINS", data: { packages } });
}

export function importPortablePlugins(
  messenger: Messenger,
  packages: (PortablePluginPackage | string)[],
  decisions: PluginImportDecision[],
): Promise<PluginImportResult> {
  return messenger.request("client:action", BACKEND, { event: "IMPORT_PORTABLE_PLUGINS", data: { packages, decisions } });
}
