import { scriptUiResponse } from "./scriptUiResponses";
import type { ScriptUiRequest } from "../store/store";

describe("script UI worker responses", () => {
  it("preserves each desktop response event and direct worker address", () => {
    const prompt = { kind: "prompt", id: "p", profileId: 4, data: { title: "Input", promptID: "p", messageAddress: 91 } } as ScriptUiRequest;
    const dialog = { kind: "dialog", id: "d", profileId: 4, data: { id: 7, title: "Confirm", buttons: [], messageAddress: 92 } } as ScriptUiRequest;
    const buttons = { kind: "buttons", id: "b", profileId: 4, data: { popupID: 8, title: "Choose", messageAddress: 93 } } as ScriptUiRequest;
    expect(scriptUiResponse(prompt as Exclude<ScriptUiRequest, { kind: "alt-update" }>, "hello", "hello")).toEqual({ event: "macro-prompt", address: 91, data: { promptID: "p", value: "hello", cancel: false } });
    expect(scriptUiResponse(dialog as Exclude<ScriptUiRequest, { kind: "alt-update" }>, "yes")).toEqual({ event: "DIALOG", address: 92, data: { id: 7, response: "yes" } });
    expect(scriptUiResponse(buttons as Exclude<ScriptUiRequest, { kind: "alt-update" }>, "retry")).toEqual({ event: "popup-buttons-8", address: 93, data: { response: "retry" } });
  });
});
