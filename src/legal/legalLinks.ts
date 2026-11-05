import { Linking } from "react-native";

const websiteUrl = "https://jnbot.netlify.app";

export const WEBSITE_URL = websiteUrl;

export const DOCUMENTATION_URL = `${websiteUrl}/docs`;

export const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ??
  `${websiteUrl}/privacy`;

export const TERMS_OF_USE_URL =
  process.env.EXPO_PUBLIC_TERMS_OF_USE_URL ??
  `${websiteUrl}/eula`;

export const GITHUB_URL = "https://github.com/JNbot-app";

export const DISCORD_URL =
  process.env.EXPO_PUBLIC_DISCORD_URL ??
  "https://discord.gg/JNbGgypERe";

export const DESKTOP_DOWNLOAD_URL =
  process.env.EXPO_PUBLIC_DESKTOP_DOWNLOAD_URL ??
  `${websiteUrl}/download`;

export async function openExternalUrl(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch (err) {
    console.warn(`[Links] Could not open URL: ${url}`, err);
    return false;
  }
}

export function openLegalDocument(url: string): Promise<void> {
  return Linking.openURL(url);
}
