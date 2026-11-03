import {
  resolveMonetizationEnvironment,
  supportsNativeMonetization,
  usesTestMonetization,
} from "./monetizationConfig";

describe("monetization environment", () => {
  test("defaults unknown values to development", () => {
    expect(resolveMonetizationEnvironment(undefined)).toBe("development");
    expect(resolveMonetizationEnvironment("staging")).toBe("development");
  });

  test("recognizes preview and production", () => {
    expect(resolveMonetizationEnvironment("preview")).toBe("preview");
    expect(resolveMonetizationEnvironment("production")).toBe("production");
  });

  test("uses test monetization outside production", () => {
    expect(usesTestMonetization("development")).toBe(true);
    expect(usesTestMonetization("preview")).toBe(true);
    expect(usesTestMonetization("production")).toBe(false);
  });

  test("enables native monetization only on Android", () => {
    expect(supportsNativeMonetization("android")).toBe(true);
    expect(supportsNativeMonetization("ios")).toBe(false);
  });
});
