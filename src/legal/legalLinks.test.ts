import { Linking } from "react-native";
import {
  DESKTOP_DOWNLOAD_URL,
  DISCORD_URL,
  PRIVACY_POLICY_URL,
  TERMS_OF_USE_URL,
  WEBSITE_URL,
  openExternalUrl,
  openLegalDocument,
} from "./legalLinks";

describe("legalLinks & external links", () => {
  it("provides expected default URLs", () => {
    expect(WEBSITE_URL).toBe("https://jnbot.netlify.app");
    expect(PRIVACY_POLICY_URL).toBe("https://jnbot.netlify.app/privacy");
    expect(TERMS_OF_USE_URL).toBe("https://jnbot.netlify.app/eula");
    expect(DISCORD_URL).toBe("https://discord.gg/JNbGgypERe");
    expect(DESKTOP_DOWNLOAD_URL).toBe("https://jnbot.netlify.app/download");
  });

  it("calls Linking.openURL on openExternalUrl and openLegalDocument", async () => {
    const openSpy = jest.spyOn(Linking, "openURL").mockResolvedValueOnce(undefined as never);
    const result = await openExternalUrl(DISCORD_URL);
    expect(result).toBe(true);
    expect(openSpy).toHaveBeenCalledWith(DISCORD_URL);

    await openLegalDocument(PRIVACY_POLICY_URL);
    expect(openSpy).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
    openSpy.mockRestore();
  });

  it("handles openURL errors gracefully in openExternalUrl", async () => {
    const openSpy = jest.spyOn(Linking, "openURL").mockRejectedValueOnce(new Error("Cannot open"));
    const result = await openExternalUrl("invalid://url");
    expect(result).toBe(false);
    openSpy.mockRestore();
  });
});
