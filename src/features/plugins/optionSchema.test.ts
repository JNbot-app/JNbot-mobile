import { choicesFromText, cleanOption, slugify, validateOption, withType } from "./optionSchema";

describe("option schema helpers", () => {
  it("suggests camelCase ids like the desktop", () => {
    expect(slugify("Max mining speed")).toBe("maxMiningSpeed");
    expect(slugify("2nd alt")).toBe("_2ndAlt");
  });

  it("drops type-specific fields when the type changes", () => {
    const next = withType({ id: "a", label: "A", type: "select", options: [{ label: "x", value: "x" }] }, "slider");
    expect(next).toEqual({ id: "a", label: "A", type: "slider", min: 0, max: 100, step: 1 });
  });

  it("validates ids, choices and ranges", () => {
    expect(validateOption({ id: "speed", label: "Speed", type: "input" }, [])).toBeNull();
    expect(validateOption({ id: "speed", label: "Speed", type: "input" }, ["speed"])).toMatch(/already uses/);
    expect(validateOption({ id: "1x", label: "X", type: "input" }, [])).toMatch(/ID/);
    expect(validateOption({ id: "x", label: "X", type: "select", options: [] }, [])).toMatch(/choice/);
    expect(validateOption({ id: "x", label: "X", type: "slider", min: 5, max: 1, step: 1 }, [])).toMatch(/Min/);
  });

  it("keeps existing choice values while editing labels as lines", () => {
    expect(choicesFromText("Wheat\n\n Carrots ", [{ label: "Wheat", value: "wheat" }])).toEqual([
      { label: "Wheat", value: "wheat" },
      { label: "Carrots", value: "Carrots" },
    ]);
  });

  it("strips empty optional fields", () => {
    expect(cleanOption({ id: " a ", label: "A ", type: "switch", required: false, tooltip: "" })).toEqual({ id: "a", label: "A", type: "switch" });
  });
});
