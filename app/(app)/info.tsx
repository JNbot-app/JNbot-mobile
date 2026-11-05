import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../src/components/Screen';
import { JNbotLogo } from '../../src/components/JNbotLogo';
import { NativeIcon } from '../../src/components/NativeIcon';
import { Txt } from '../../src/components/ui';
import { useConnection } from '../../src/net/ConnectionProvider';
import { REMOTE_PROTOCOL_VERSION } from '../../src/runtime/types';
import {
  DESKTOP_DOWNLOAD_URL,
  DISCORD_URL,
  DOCUMENTATION_URL,
  GITHUB_URL,
  openExternalUrl,
  PRIVACY_POLICY_URL,
  TERMS_OF_USE_URL,
  WEBSITE_URL,
} from '../../src/legal/legalLinks';
import { colors, radii, spacing } from '../../src/theme/theme';

type Resource = {
  title: string;
  description: string;
  url: string;
  sf: React.ComponentProps<typeof NativeIcon>['sf'];
  material: React.ComponentProps<typeof NativeIcon>['material'];
};

const resources: Resource[] = [
  { title: 'Website', description: 'Explore JNbot', url: WEBSITE_URL, sf: 'globe', material: 'language' },
  { title: 'Documentation', description: 'Guides and references', url: DOCUMENTATION_URL, sf: 'book', material: 'menu-book' },
  { title: 'Download Desktop App', description: 'Get JNbot for your computer', url: DESKTOP_DOWNLOAD_URL, sf: 'desktopcomputer', material: 'desktop-windows' },
  { title: 'GitHub', description: 'JNbot is open source', url: GITHUB_URL, sf: 'chevron.left.forwardslash.chevron.right', material: 'code' },
  { title: 'Join Discord Server', description: 'Connect with the community', url: DISCORD_URL, sf: 'bubble.left.and.bubble.right', material: 'forum' },
];

const legal: Resource[] = [
  { title: 'Privacy Policy', description: 'How your data is handled', url: PRIVACY_POLICY_URL, sf: 'hand.raised', material: 'privacy-tip' },
  { title: 'Terms of Use', description: 'Terms for using JNbot', url: TERMS_OF_USE_URL, sf: 'doc.text', material: 'description' },
];

async function openResource(resource: Resource) {
  if (!await openExternalUrl(resource.url)) {
    Alert.alert(`Could not open ${resource.title}`, 'Please try again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Try again', onPress: () => void openResource(resource) },
    ]);
  }
}

export default function Info() {
  const { target } = useConnection();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Screen title="Info" back>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.identity}>
          <JNbotLogo size={76} />
          <Txt variant="title" accessibilityRole="header" style={styles.appName}>JNbot Mobile</Txt>
          <Txt variant="muted">Version {Constants.expoConfig?.version ?? '1.0.0'}</Txt>
        </View>

        <ResourceGroup title="Resources" items={resources} />
        <ResourceGroup title="Legal" items={legal} />

        <View style={styles.section}>
          <Txt variant="label" accessibilityRole="header" style={styles.sectionTitle}>App details</Txt>
          <View style={styles.group}>
            <DetailRow label="Protocol" value={`v${REMOTE_PROTOCOL_VERSION}`} />
            <View style={styles.separator} />
            <DetailRow label="Runtime target" value={target?.kind === 'remote' ? 'Remote' : 'This phone'} />
            <View style={styles.separator} />
            <Pressable accessibilityRole="button" onPress={() => router.push('/(app)/profiles')} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Txt style={styles.rowText}>Choose profile</Txt>
              <NativeIcon sf="chevron.right" material="chevron-right" size={18} color={colors.textFaint} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function ResourceGroup({ title, items }: { title: string; items: Resource[] }) {
  return (
    <View style={styles.section}>
      <Txt variant="label" accessibilityRole="header" style={styles.sectionTitle}>{title}</Txt>
      <View style={styles.group}>
        {items.map((item, index) => (
          <React.Fragment key={item.url}>
            {index > 0 ? <View style={styles.linkSeparator} /> : null}
            <Pressable accessibilityRole="link" accessibilityLabel={item.title} accessibilityHint="Opens outside the app" onPress={() => void openResource(item)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <NativeIcon sf={item.sf} material={item.material} size={22} color={colors.primary} />
              <View style={styles.rowText}>
                <Txt>{item.title}</Txt>
                <Txt variant="muted" style={styles.description}>{item.description}</Txt>
              </View>
              <NativeIcon sf="arrow.up.right" material="north-east" size={17} color={colors.textFaint} />
            </Pressable>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Txt style={styles.rowText}>{label}</Txt><Txt variant="muted" style={styles.detailValue}>{value}</Txt></View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, width: '100%', maxWidth: 640, alignSelf: 'center' },
  identity: { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.xl },
  appName: { marginTop: spacing.md, marginBottom: spacing.xs, textAlign: 'center' },
  section: { marginBottom: spacing.xl },
  sectionTitle: { marginLeft: spacing.md, marginBottom: spacing.sm },
  group: { backgroundColor: colors.surface, borderRadius: radii.lg, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderSubtle, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  rowText: { flex: 1, minWidth: 0 },
  description: { marginTop: 2 },
  detailValue: { flexShrink: 1, textAlign: 'right' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSubtle, marginLeft: spacing.md },
  linkSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSubtle, marginLeft: spacing.md + 22 + spacing.md },
  pressed: { backgroundColor: colors.surfaceHover },
});
