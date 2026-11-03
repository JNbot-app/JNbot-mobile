import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Button, EmptyState, Txt } from '../../src/components/ui';
import { CreateProfileView } from '../../src/features/profiles/CreateProfileView';
import { ImportDesktopView } from '../../src/features/profiles/ImportDesktopView';
import { MarketplaceProfileList } from '../../src/features/profiles/MarketplaceProfileList';
import { OnboardingFlow } from '../../src/features/onboarding/OnboardingFlow';
import { useSafeBack } from '../../src/hooks/useSafeBack';
import { useConnection } from '../../src/net/ConnectionProvider';
import type { ProfileMeta } from '../../src/runtime/types';
import type { MarketEntry } from '../../src/generated/client-contract/share';
import { useMarketProfiles } from '../../src/features/shares';
import { selectCanManageProfiles, useStore } from '../../src/store/store';
import { colors, radii, spacing } from '../../src/theme/theme';
import { ProfileIcon } from '../../src/components/ProfileIcon';
import { useOpenShareLink } from '../../src/features/shares';

type Tab = 'profiles' | 'marketplace';

export default function Profiles() {
  const router = useRouter();
  const goBack = useSafeBack();
  const openShareLink = useOpenShareLink();
  const {
    createProfile,
    selectProfile,
    installMarketplaceProfile,
    switchToPhone,
    deleteProfile,
    mode,
  } = useConnection();
  const profiles = useStore((state) => state.profiles);
  const active = useStore((state) => state.activeProfileKey);
  const summaries = useStore((state) => state.runtimeSummaries);
  const alts = useStore((state) => state.alts);
  const canManageProfiles = useStore(selectCanManageProfiles);
  const localMode = mode === 'local';
  const canAddProfile = localMode || canManageProfiles;
  const [tab, setTab] = useState<Tab>(active ? 'profiles' : 'marketplace');
  const [switching, setSwitching] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsSelection = !active;
  // Latched: the flow keeps going after its first step selects a profile.
  const [onboarding, setOnboarding] = useState(needsSelection && localMode);
  if (needsSelection && localMode && !onboarding) setOnboarding(true);
  const runtimeDescription = mode === 'remote'
    ? needsSelection ? 'Pick a profile from your paired desktop.' : 'Profiles on your paired desktop.'
    : needsSelection ? 'Choose a ready-made server or add your own.' : 'Profiles stored on this phone.';
  const activeProfile = profiles.find((profile) => profile.id === active);
  const otherProfiles = profiles.filter((profile) => profile.id !== active);
  const { profiles: availableMarketplace } = useMarketProfiles();

  const close = () => {
    if (!needsSelection) goBack();
  };

  const choose = async (id: string) => {
    if (id === active) {
      router.replace('/(app)/dashboard');
      return;
    }

    setSwitching(id);
    setError(null);
    try {
      await selectProfile(id);
      router.replace('/(app)/dashboard');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to select this profile.');
    } finally {
      setSwitching(null);
    }
  };

  const install = async (entry: MarketEntry) => {
    if (!entry.publisher.official || !entry.canInstall) {
      router.push({ pathname: '/(app)/share/[id]', params: { id: entry.id } });
      return;
    }
    setSwitching(`marketplace:${entry.id}`);
    setError(null);
    try {
      await installMarketplaceProfile(entry.id);
      router.replace('/(app)/dashboard');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to add this profile.');
    } finally {
      setSwitching(null);
    }
  };

  const browsePhoneProfiles = async () => {
    setSwitching('phone');
    setError(null);
    try {
      await switchToPhone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to start JNbot on this phone.');
    } finally {
      setSwitching(null);
    }
  };

  const beginCreate = async () => {
    setSwitching('create');
    setError(null);
    try {
      if (mode === 'remote') await switchToPhone();
      setShowCreate(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to start profile creation.');
    } finally {
      setSwitching(null);
    }
  };

  const removeProfile = async (id: string) => {
    const operation = `remove:${id}`;
    setSwitching(operation);
    setError(null);
    try {
      await deleteProfile(id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to remove this profile.');
    } finally {
      setSwitching(null);
    }
  };

  /** The row's "…" menu on this phone: share or remove. */
  const profileMenu = (id: string, profileName: string) => {
    Alert.alert(profileName, undefined, [
      { text: 'Share link', onPress: () => openShareLink({ kind: 'profile', ref: id, title: profileName }) },
      { text: 'Remove', style: 'destructive' as const, onPress: () => confirmRemove(id, profileName) },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const confirmRemove = (id: string, profileName: string) => {
    Alert.alert(
      `Remove ${profileName}?`,
      'This removes the profile from this phone. Marketplace profiles can be added again later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => void removeProfile(id),
        },
      ],
    );
  };

  if (onboarding) return <OnboardingFlow />;

  if (showCreate) {
    return (
      <CreateProfileView
        createProfile={createProfile}
        onBack={() => setShowCreate(false)}
        onCreated={() => router.replace('/(app)/dashboard')}
      />
    );
  }

  if (showImport) {
    return (
      <ImportDesktopView
        onBack={() => setShowImport(false)}
        onImported={() => router.replace('/(app)/dashboard')}
      />
    );
  }

  return (
    <Screen
      back={!needsSelection}
      onBack={close}
      menu={false}
      title="Profiles"
      subtitle={runtimeDescription}
      right={mode ? <RuntimeBadge mode={mode} /> : null}
    >
      {canAddProfile && (
        <View style={styles.tabsWrap}>
          <View accessibilityRole="tablist" style={styles.tabs}>
            <TabButton
              label="Profiles"
              selected={tab === 'profiles'}
              onPress={() => setTab('profiles')}
            />
            <TabButton
              label="Marketplace"
              selected={tab === 'marketplace'}
              onPress={() => setTab('marketplace')}
            />
          </View>
        </View>
      )}

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        {tab === 'profiles' ? (
          <>
            {activeProfile ? (
              <View style={styles.section}>
                <Txt variant="label" style={styles.sectionTitle}>Active profile</Txt>
                <CurrentProfile
                  profile={activeProfile}
                  detail={`${countLabel(summaries[activeProfile.id]?.bots ?? 0, 'bot')} · ${countLabel(summaries[activeProfile.id]?.scripts ?? 0, 'script')} · ${countLabel(alts.length, 'account')}`}
                  onPress={() => router.replace('/(app)/dashboard')}
                  onShare={
                    localMode
                      ? () => openShareLink({ kind: 'profile', ref: activeProfile.id, title: activeProfile.name })
                      : undefined
                  }
                />
              </View>
            ) : null}

            <View style={styles.section}>
              <Txt variant="label" style={styles.sectionTitle}>
                {activeProfile ? 'Other profiles' : 'Your profiles'}
              </Txt>
              {otherProfiles.length ? (
                <View style={styles.group}>
                  {otherProfiles.map((profile, index) => (
                    <ProfileRow
                      key={profile.id}
                      profile={profile}
                      detail={`${countLabel(summaries[profile.id]?.bots ?? 0, 'bot')} · ${countLabel(summaries[profile.id]?.scripts ?? 0, 'script')}`}
                      busy={switching === profile.id}
                      disabled={Boolean(switching) && switching !== profile.id}
                      separated={index > 0}
                      onPress={() => void choose(profile.id)}
                      onRemove={localMode ? () => profileMenu(profile.id, profile.name) : undefined}
                    />
                  ))}
                </View>
              ) : (
                <EmptyState
                  icon={<Ionicons name="layers-outline" size={28} color={colors.textFaint} />}
                  title={profiles.length ? 'No other profiles' : 'No profiles yet'}
                  subtitle={profiles.length ? 'Your current profile is ready to use.' : 'Create a profile or add one from the marketplace.'}
                />
              )}
            </View>

            <View style={styles.section}>
              <Txt variant="label" style={styles.sectionTitle}>Add a profile</Txt>
              <View style={styles.group}>
                {canAddProfile && (
                  <>
                    <ActionRow
                      icon="add-circle-outline"
                      title="Create profile"
                      subtitle="Set up a Minecraft server manually"
                      onPress={() => void beginCreate()}
                    />
                    <ActionRow
                      icon="desktop-outline"
                      title="Import from desktop"
                      subtitle="Restore full instance via cloud or backup file"
                      separated
                      onPress={() => setShowImport(true)}
                    />
                  </>
                )}
                <ActionRow
                  icon="qr-code-outline"
                  title="Connect to remote instance"
                  subtitle="Pair with JNbot Desktop via QR code"
                  separated
                  onPress={() => router.push('/scan')}
                />
                {!localMode ? (
                  <ActionRow
                    icon="phone-portrait-outline"
                    title="Switch to this phone"
                    subtitle="Run JNbot locally on this device"
                    separated
                    loading={switching === 'phone'}
                    onPress={() => void browsePhoneProfiles()}
                  />
                ) : null}
              </View>
            </View>
          </>
        ) : (
          <MarketplaceContent
            localMode={localMode}
            profiles={availableMarketplace}
            switching={switching}
            onInstall={(entry) => void install(entry)}
            onUsePhone={() => void browsePhoneProfiles()}
          />
        )}

        {error ? (
          <View accessibilityRole="alert" style={styles.error}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Txt variant="muted" style={styles.errorText}>{error}</Txt>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function RuntimeBadge({ mode }: { mode: 'local' | 'remote' }) {
  const remote = mode === 'remote';
  return (
    <View style={[styles.runtimeBadge, remote ? styles.remoteBadge : styles.localBadge]}>
      <Ionicons
        name={remote ? 'desktop-outline' : 'phone-portrait-outline'}
        size={13}
        color={remote ? colors.info : colors.primary}
      />
      <Txt variant="faint" style={[styles.runtimeBadgeText, remote ? styles.remoteBadgeText : styles.localBadgeText]}>
        {remote ? 'Remote' : 'This phone'}
      </Txt>
    </View>
  );
}

function countLabel(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

function TabButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        selected && styles.tabSelected,
        pressed && !selected && styles.tabPressed,
      ]}
    >
      <Txt variant="label" style={selected ? styles.tabLabelSelected : undefined}>{label}</Txt>
    </Pressable>
  );
}

function CurrentProfile({
  profile,
  detail,
  onPress,
  onShare,
}: {
  profile: ProfileMeta;
  detail: string;
  onPress?: () => void;
  onShare?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${profile.name} overview`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.currentProfile,
        pressed && styles.currentProfilePressed,
      ]}
    >
      <ProfileIcon uri={profile.icon} color={profile.color} size={52} />
      <View style={styles.profileCopy}>
        <View style={styles.currentTitleRow}>
          <Txt variant="heading" numberOfLines={1} style={styles.profileName}>{profile.name}</Txt>
          <View style={styles.currentBadge}>
            <Ionicons name="checkmark" size={12} color={colors.primary} />
            <Txt variant="faint" style={styles.currentBadgeText}>Current</Txt>
          </View>
        </View>
        <Txt variant="muted" numberOfLines={2}>{detail}</Txt>
      </View>
      {onShare ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Share ${profile.name}`}
          hitSlop={8}
          onPress={onShare}
          style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]}
        >
          <Ionicons name="share-outline" size={20} color={colors.textMuted} />
        </Pressable>
      ) : null}
      <Ionicons name="chevron-forward" size={19} color={colors.primary} />
    </Pressable>
  );
}

function ProfileRow({
  profile,
  detail,
  busy,
  disabled,
  separated,
  onPress,
  onRemove,
}: {
  profile: ProfileMeta;
  detail: string;
  busy: boolean;
  disabled: boolean;
  separated: boolean;
  onPress: () => void;
  onRemove?: () => void;
}) {
  return (
    <View style={[styles.profileRowShell, separated && styles.separator]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Use ${profile.name}`}
        accessibilityState={{ disabled: disabled || busy }}
        disabled={disabled || busy}
        onPress={onPress}
        style={({ pressed }) => [styles.profileRow, pressed && styles.pressed]}
      >
        <ProfileIcon uri={profile.icon} color={profile.color} size={44} />
        <View style={styles.profileCopy}>
          <Txt variant="heading" numberOfLines={1}>{profile.name}</Txt>
          <Txt variant="faint" numberOfLines={1}>{detail}</Txt>
        </View>
        {busy ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <Ionicons name="chevron-forward" size={19} color={colors.textFaint} />
        )}
      </Pressable>
      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${profile.name}`}
          disabled={disabled || busy}
          onPress={onRemove}
          style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function MarketplaceContent({
  localMode,
  profiles,
  switching,
  onInstall,
  onUsePhone,
}: {
  localMode: boolean;
  profiles: MarketEntry[];
  switching: string | null;
  onInstall: (entry: MarketEntry) => void;
  onUsePhone: () => void;
}) {
  if (!localMode) {
    return (
      <View style={styles.marketplaceIntro}>
        <View style={styles.marketplaceIcon}>
          <Ionicons name="storefront-outline" size={30} color={colors.primary} />
        </View>
        <Txt variant="heading" style={styles.center}>Browse profiles on this phone</Txt>
        <Txt variant="muted" style={styles.center}>
          Marketplace profiles install into the phone runtime, not the paired desktop.
        </Txt>
        <Button
          title="Switch to this phone"
          loading={switching === 'phone'}
          disabled={Boolean(switching)}
          full
          onPress={onUsePhone}
        />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.marketplaceHeader}>
        <View style={styles.marketplaceHeaderCopy}>
          <Txt variant="heading">Ready-made profiles</Txt>
          <Txt variant="muted">Add a preconfigured server profile.</Txt>
        </View>
      </View>
      <MarketplaceProfileList
        profiles={profiles}
        switching={switching}
        onInstall={onInstall}
        emptyTitle="You have them all"
        emptySubtitle="Every marketplace profile is already installed."
      />
    </View>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
  loading = false,
  disabled = false,
  separated = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  separated?: boolean;
}) {
  const isBlocked = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isBlocked }}
      disabled={isBlocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        separated && styles.separator,
        isBlocked && styles.actionDisabled,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={22} color={isBlocked ? colors.textFaint : colors.primary} />
      </View>
      <View style={styles.profileCopy}>
        <Txt variant="heading">{title}</Txt>
        <Txt variant="faint">{subtitle}</Txt>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : !disabled ? (
        <Ionicons name="chevron-forward" size={19} color={colors.textFaint} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  runtimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  remoteBadge: {
    backgroundColor: colors.infoSoft,
  },
  localBadge: {
    backgroundColor: colors.primarySoft,
  },
  runtimeBadgeText: {
    fontWeight: '600',
  },
  remoteBadgeText: {
    color: colors.info,
  },
  localBadgeText: {
    color: colors.primary,
  },
  tabsWrap: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  tabs: {
    flexDirection: 'row',
    gap: 3,
    padding: 3,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
  },
  tab: {
    flex: 1,
    minHeight: process.env.EXPO_OS === 'android' ? 48 : 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  tabSelected: {
    backgroundColor: colors.surfaceHover,
  },
  tabPressed: {
    backgroundColor: colors.surface,
  },
  tabLabelSelected: {
    color: colors.text,
  },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    flexGrow: 1,
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    paddingHorizontal: spacing.xs,
  },
  group: {
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
  },
  currentProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.primarySoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primaryDim,
  },
  currentProfilePressed: {
    opacity: 0.85,
  },
  profileRowShell: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  profileRow: {
    minHeight: 72,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  profileName: {
    flexShrink: 1,
  },
  currentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.bgElevated,
  },
  currentBadgeText: {
    color: colors.primary,
  },
  moreButton: {
    width: process.env.EXPO_OS === 'android' ? 48 : 44,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  actionRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  actionIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  actionDisabled: {
    opacity: 0.55,
  },
  marketplaceIntro: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  marketplaceIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderRadius: radii.xl,
    borderCurve: 'continuous',
    backgroundColor: colors.primarySoft,
  },
  marketplaceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  marketplaceHeaderCopy: {
    flex: 1,
    gap: 3,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
  },
  center: {
    textAlign: 'center',
  },
  pressed: {
    backgroundColor: colors.surfaceHover,
  },
});
