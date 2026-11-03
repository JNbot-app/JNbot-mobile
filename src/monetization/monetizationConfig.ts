export type MonetizationEnvironment = "development" | "preview" | "production";

export function resolveMonetizationEnvironment(
  value: string | undefined,
): MonetizationEnvironment {
  if (value === "production") return "production";
  if (value === "preview") return "preview";
  return "development";
}

export function usesTestMonetization(
  value: string | undefined,
): boolean {
  return resolveMonetizationEnvironment(value) !== "production";
}

export function supportsNativeMonetization(platform: string): boolean {
  return platform === "android";
}
