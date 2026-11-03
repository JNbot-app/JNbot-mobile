import { applyCompletion, completionMatches, rememberChatMessage, useChatHistory } from "./chat";

describe("chat composer helpers", () => {
  it("replaces only the word being typed", () => {
    expect(applyCompletion("/warp sp", "spawn")).toBe("/warp spawn");
    expect(applyCompletion("/wa", "/warp")).toBe("/warp");
    expect(applyCompletion("/is ", "home")).toBe("/is home");
  });

  it("normalizes both tab-complete result shapes", () => {
    expect(completionMatches(["/warp", ""])).toEqual(["/warp"]);
    expect(completionMatches([{ match: "spawn" }, { tooltip: "x" }])).toEqual(["spawn"]);
    expect(completionMatches(undefined)).toEqual([]);
  });

  it("keeps recent messages newest first without duplicates", () => {
    rememberChatMessage("/spawn");
    rememberChatMessage("hello");
    rememberChatMessage("/spawn");
    expect(useChatHistory.getState()).toEqual(["/spawn", "hello"]);
  });
});
