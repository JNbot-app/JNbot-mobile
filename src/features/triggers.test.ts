import { TRIGGER_ACTION_ICONS, TRIGGER_ACTION_TYPES, TRIGGER_EVENT_ICONS, TRIGGER_EVENTS } from "./triggers";

describe("trigger icons", () => {
  it("covers every desktop event and action", () => {
    expect(Object.keys(TRIGGER_EVENT_ICONS).sort()).toEqual(Object.keys(TRIGGER_EVENTS).sort());
    expect(Object.keys(TRIGGER_ACTION_ICONS).sort()).toEqual(Object.keys(TRIGGER_ACTION_TYPES).sort());
  });
});
