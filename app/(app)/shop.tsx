import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../src/components/Screen";
import { Badge, Button, Card, Txt } from "../../src/components/ui";
import { useMonetization } from "../../src/monetization/MonetizationProvider";
import {
  openLegalDocument,
  PRIVACY_POLICY_URL,
  TERMS_OF_USE_URL,
} from "../../src/legal/legalLinks";
import { colors, radii, spacing } from "../../src/theme/theme";

export default function Shop() {
  const monetization = useMonetization();
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const purchase = async () => {
    setMessage(null);
    try {
      const result = await monetization.purchaseRemoveAds();
      if (result === "purchased") setMessage({ text: "Ads have been removed forever on this store account." });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "The purchase could not be completed.", error: true });
    }
  };
  const restore = async () => {
    setMessage(null);
    try {
      setMessage({ text: await monetization.restorePurchases() ? "Your ad-free purchase has been restored." : "No ad-free purchase was found for this store account." });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Purchases could not be restored.", error: true });
    }
  };
  const privacy = async () => {
    setMessage(null);
    try {
      if (!await monetization.openPrivacyChoices()) setMessage({ text: "No additional privacy choices are required in your region." });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Privacy choices could not be opened.", error: true });
    }
  };

  return <Screen title="Shop" subtitle="Support JNbot" back>
    <ScrollView contentContainerStyle={styles.scroll}>
      <Card style={{ gap: spacing.lg }}>
        <View style={styles.hero}>
          <View style={styles.icon}><Ionicons name={monetization.isAdFree ? "heart" : "heart-outline"} size={23} color={monetization.isAdFree ? colors.success : colors.primary} /></View>
          <View style={{ flex: 1, gap: 3 }}>
            <Txt variant="heading">{monetization.isAdFree ? "Thank you for your support" : "Keep JNbot free"}</Txt>
            <Txt variant="muted">{monetization.isAdFree ? "This app will no longer show occasional ads before starting bots or scripts." : "Remove occasional ads permanently with a one-time purchase."}</Txt>
          </View>
        </View>
        {monetization.isAdFree ? <View style={{ alignItems: "flex-start" }}><Badge label="Ad-free forever" color={colors.success} bg={colors.successSoft} icon={<Ionicons name="checkmark-circle" size={15} color={colors.success} />} /></View> : <Button title={monetization.purchaseAvailable && monetization.removeAdsPrice ? `Remove ads forever — ${monetization.removeAdsPrice}` : monetization.ready ? "Remove ads forever — unavailable" : "Loading purchase…"} full loading={monetization.purchasing || !monetization.ready} disabled={!monetization.purchaseAvailable} icon={<Ionicons name="sparkles" size={17} color={colors.primaryOn} />} onPress={() => void purchase()} />}
        <View style={styles.actions}>
          <Button title="Restore purchase" variant="secondary" style={{ flex: 1 }} loading={monetization.purchasing} disabled={!monetization.purchasesConfigured} onPress={() => void restore()} />
          <Button title="Privacy choices" variant="ghost" style={{ flex: 1 }} onPress={() => void privacy()} />
        </View>
        <View style={styles.legalLinks}>
          <Button title="Privacy Policy" variant="ghost" onPress={() => void openLegalDocument(PRIVACY_POLICY_URL)} />
          <Button title="Terms of Use" variant="ghost" onPress={() => void openLegalDocument(TERMS_OF_USE_URL)} />
        </View>
        {message ? <View style={[styles.message, message.error && styles.error]}><Txt variant="muted" style={{ color: message.error ? colors.danger : colors.textMuted }}>{message.text}</Txt></View> : null}
        <Txt variant="faint">Purchases restore on the same Google account.</Txt>
      </Card>
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hero: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  icon: { width: 46, height: 46, borderRadius: radii.lg, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  actions: { flexDirection: "row", gap: spacing.sm },
  legalLinks: { flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  message: { padding: spacing.sm, borderRadius: radii.sm, backgroundColor: colors.surfaceAlt },
  error: { backgroundColor: colors.dangerSoft },
});
