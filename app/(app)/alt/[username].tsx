import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Screen } from '../../../src/components/Screen';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Button, Card, EmptyState, StatusDot, Txt } from '../../../src/components/ui';
import { AltHeroCard } from '../../../src/components/alt/AltHeroCard';
import { AltKpiGrid } from '../../../src/components/alt/AltKpiGrid';
import { AltRanksCard } from '../../../src/components/alt/AltRanksCard';
import { AltGkitsCard } from '../../../src/components/alt/AltGkitsCard';
import { AltDetailsCard } from '../../../src/components/alt/AltDetailsCard';
import { ProfileUiView } from '../../../src/components/profileUi/ProfileUiView';
import { useProfileUi } from '../../../src/hooks/useProfileUi';
import { useClient } from '../../../src/net/ConnectionProvider';
import {
  selectCanUseAccounts,
  selectCanUseActiveBots,
  selectCanUseScripts,
  useStore,
} from '../../../src/store/store';
import { useSafeBack } from '../../../src/hooks/useSafeBack';
import { countAltGkits, countAltRanks } from '../../../src/features/alts';
import { colors, font, radii, spacing } from '../../../src/theme/theme';
import { useFeedback } from '../../../src/components/AppFeedback';

const ALL_EDGES = ['top', 'bottom', 'left', 'right'] as const;

export default function AltOverviewScreen() {
  const { showMessage } = useFeedback();
  const goBack = useSafeBack('/(app)/alts');
  const router = useRouter();
  const client = useClient();
  const { username } = useLocalSearchParams<{ username: string }>();

  const alts = useStore((s) => s.alts);
  const activeBots = useStore((s) => s.activeBots);
  const altTags = useStore((s) => s.settings.altTags);
  const jndata = useStore((s) => s.JNdata);
  const profileKey = useStore((s) => s.activeProfileKey);
  const canUseAccounts = useStore(selectCanUseAccounts);
  const canUseActiveBots = useStore(selectCanUseActiveBots);
  const canUseScripts = useStore(selectCanUseScripts);
  const canManage = canUseAccounts && useStore((s) => s.capabilities.includes('alts.manage'));
  const canJoin = canUseAccounts && canUseActiveBots && canUseScripts && useStore((s) => s.capabilities.includes('scripts'));
  const stats = useStore((s) => s.stats);

  const profileUi = useProfileUi(username);
  const [deleting, setDeleting] = useState(false);
  const [joining, setJoining] = useState(false);

  const alt = useMemo(
    () =>
      username
        ? alts.find((a) => a.username.toLowerCase() === username.toLowerCase())
        : undefined,
    [alts, username],
  );

  const liveBot = useMemo(
    () =>
      username
        ? activeBots.find(
            (b) => b.username && b.username.toLowerCase() === username.toLowerCase(),
          )
        : undefined,
    [activeBots, username],
  );

  const isOnline = Boolean(liveBot);

  const matchingTags = useMemo(
    () => (alt ? altTags.filter((t) => t.alts.includes(alt.username)) : []),
    [altTags, alt],
  );

  const serverConfig = useMemo(
    () => (profileKey ? jndata?.data?.[profileKey] : undefined),
    [jndata, profileKey],
  );

  const serverGamemodes = useMemo(
    () => (profileKey ? jndata?.servers?.[profileKey] ?? {} : {}),
    [jndata, profileKey],
  );

  const ranksList = useMemo(() => {
    if (!alt?.data?.ranks) return [];
    return Object.entries(alt.data.ranks)
      .filter(([, rank]) => Boolean(rank))
      .map(([gamemode, rank]) => {
        const gmConfig = serverGamemodes[gamemode] as
          | { ranks?: Record<string, { color?: string }> }
          | undefined;
        const color = gmConfig?.ranks?.[rank]?.color;
        return { gamemode, rank, color };
      });
  }, [alt?.data?.ranks, serverGamemodes]);

  const gkitsGroups = useMemo(() => {
    if (!alt?.data?.gkits) return [];
    return Object.entries(alt.data.gkits)
      .filter(([, items]) => Array.isArray(items) && items.length > 0)
      .map(([gamemode, items]) => ({ gamemode, items }));
  }, [alt?.data?.gkits]);

  const altStats = useMemo(() => {
    if (!username) return null;
    const rawStats = stats as unknown as {
      alts?: Record<
        string,
        {
          joinCount?: number;
          lastJoined?: number | null;
          playTime?: number;
          createdOn?: number;
        }
      >;
    };
    return rawStats?.alts?.[username] ?? null;
  }, [stats, username]);

  const openEditor = () => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.selectionAsync();
    }
    if (alt) {
      router.push({
        pathname: '/(app)/alt/editor',
        params: { username: alt.username },
      });
    }
  };

  const openProfile = (name: string) =>
    router.push({ pathname: '/(app)/alt/[username]', params: { username: name } });

  const handleJoin = async () => {
    if (!client || !alt || joining) return;
    try {
      setJoining(true);
      const defaultVersion = jndata?.versions?.[0] || '1.8.9';
      await client.joinBot(alt.username, defaultVersion);
      if (process.env.EXPO_OS === 'ios') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      showMessage(`Could not join bot: ${err instanceof Error ? err.message : 'Unknown error occurred.'}`, 'error');
    } finally {
      setJoining(false);
    }
  };

  const handleOpenBotConsole = () => {
    if (!liveBot) return;
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.selectionAsync();
    }
    router.push({
      pathname: '/(app)/bot/[botId]',
      params: { botId: String(liveBot.botId) },
    });
  };

  const handleRemove = () => {
    if (!alt) return;
    Alert.alert(
      'Remove alt?',
      `${alt.username} will be removed from this profile.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!client) return;
            setDeleting(true);
            try {
              await client.deleteAlt(alt.username);
              if (process.env.EXPO_OS === 'ios') {
                void Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
              }
              goBack();
            } catch (err) {
              showMessage(`Could not remove alt: ${err instanceof Error ? err.message : 'Unknown error occurred.'}`, 'error');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (!canUseAccounts) {
    return (
      <Screen back onBack={goBack} edges={ALL_EDGES} title="Account">
        <EmptyState
          icon={<Ionicons name="lock-closed-outline" size={48} color={colors.textFaint} />}
          title="Accounts disabled"
          subtitle="Your remote access link does not have permission to view or manage accounts."
        />
      </Screen>
    );
  }

  if (!alt && (profileUi.loading || profileUi.json)) {
    return (
      <Screen back onBack={goBack} edges={ALL_EDGES} title={username}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {profileUi.json ? (
            <ProfileUiView json={profileUi.json} onSelectUser={openProfile} />
          ) : (
            <ActivityIndicator style={styles.loading} color={colors.textMuted} />
          )}
        </ScrollView>
      </Screen>
    );
  }

  if (!alt) {
    return (
      <Screen back onBack={goBack} edges={ALL_EDGES} title="Alt not found">
        <EmptyState
          title="Account unavailable"
          subtitle="It may have been removed or belongs to another profile."
        />
      </Screen>
    );
  }

  const rankCount = countAltRanks(alt.data);
  const gkitCount = countAltGkits(alt.data);

  const liveBanner = isOnline && liveBot ? (
    <Pressable
      onPress={handleOpenBotConsole}
      style={({ pressed }) => [
        styles.liveBanner,
        pressed && styles.liveBannerPressed,
      ]}
    >
      <View style={styles.liveBannerLeft}>
        <StatusDot color={colors.online} size={10} pulse />
        <View>
          <Txt variant="heading" style={styles.liveBannerTitle}>
            Bot Active ({liveBot.SCRIPT_NAME})
          </Txt>
          <Txt variant="faint">Tap to open live console & controls</Txt>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.online} />
    </Pressable>
  ) : null;

  return (
    <Screen
      back
      onBack={goBack}
      edges={ALL_EDGES}
      title={alt.username}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {profileUi.loading ? (
          <Card style={styles.loadingCard}>
            <ActivityIndicator color={colors.textMuted} />
          </Card>
        ) : profileUi.json ? (
          <>
            {liveBanner}
            {/* Profile UI plugin replaces the built-in overview */}
            <ProfileUiView json={profileUi.json} onSelectUser={openProfile} />
          </>
        ) : (
          <>
            <AltHeroCard
              alt={alt}
              isOnline={isOnline}
              onlineScript={liveBot?.SCRIPT_NAME}
              tags={matchingTags}
              displayRank={ranksList[0]?.rank}
            />
            {liveBanner}
            <AltKpiGrid
              rankCount={rankCount}
              gkitCount={gkitCount}
              playTimeMs={altStats?.playTime ?? 0}
              joinCount={altStats?.joinCount ?? 0}
            />
            <AltRanksCard ranks={ranksList} />
            <AltGkitsCard groups={gkitsGroups} />
          </>
        )}

        {/* Details Card */}
        <AltDetailsCard
          alt={alt}
          serverName={serverConfig?.name}
          lastJoined={altStats?.lastJoined}
          createdOn={altStats?.createdOn}
        />

        {/* Actions Section */}
        <View style={styles.actionSection}>
          {!isOnline && canJoin ? (
            <Button
              title="Join bot"
              icon={<Ionicons name="play" size={16} color={colors.primaryOn} />}
              loading={joining}
              onPress={() => void handleJoin()}
            />
          ) : null}

          {canManage ? (
            <View style={styles.manageButtonsRow}>
              <Button
                title="Edit account"
                variant="secondary"
                style={styles.flexButton}
                onPress={openEditor}
              />
              <Button
                title="Remove"
                variant="danger"
                loading={deleting}
                style={styles.flexButton}
                onPress={handleRemove}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
    gap: spacing.md,
  },
  loading: {
    marginTop: spacing.xl,
  },
  loadingCard: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.35)',
  },
  liveBannerPressed: {
    backgroundColor: colors.surfaceHover,
  },
  liveBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  liveBannerTitle: {
    fontSize: font.size.base,
    fontWeight: '600',
    color: colors.text,
  },
  actionSection: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  manageButtonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flexButton: {
    flex: 1,
  },
});
