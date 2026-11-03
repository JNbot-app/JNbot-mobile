import type { ScriptUiRequest } from "../store/store";

export type InteractiveScriptRequest = Exclude<ScriptUiRequest, { kind: "alt-update" }>;

export function scriptUiResponse(
  request: InteractiveScriptRequest,
  response: string | null,
  value = "",
  cancel = false,
) {
  if (request.kind === "prompt")
    return {
      event: "macro-prompt",
      address: request.data.messageAddress,
      data: { promptID: request.data.promptID, value, cancel },
    };
  if (request.kind === "dialog")
    return {
      event: "DIALOG",
      address: request.data.messageAddress,
      data: { id: request.data.id, response },
    };
  return {
    event: `popup-buttons-${request.data.popupID}`,
    address: request.data.messageAddress,
    data: { response },
  };
}
