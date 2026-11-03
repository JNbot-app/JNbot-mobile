import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, StatusDot } from '../ui';
import type { MacroInfo } from '../../store/types';
import type { ProfileScriptInfo } from '../../hooks/useProfileScriptInfos';
import { colors, spacing } from '../../theme/theme';

export const SOURCE_LABELS: Record<string, string> = {
  plugin: 'Local plugin',
  bundled: 'File on disk',
  url: 'From URL',
};

export interface AuthorInfo {
  author?: string;
  signature?: {
    publisherName?: string;
    signedAt?: number;
    fingerprint?: string;
  };
  signedAt?: number;
  fingerprint?: string;
  securityStatus?: string;
  importOwner?: string;
}

export function getAuthorInfo(
  plugin: MacroInfo,
  profileScript?: ProfileScriptInfo | null,
): AuthorInfo {
  const profileSig = (profileScript as any)?.signature;
  const author =
    plugin.security?.publisherName ||
    plugin.security?.signature?.publisherName ||
    profileSig?.publisherName;

  const signature = plugin.security?.signature || profileSig;
  const signedAt = signature?.signedAt;
  const fingerprint = plugin.security?.fingerprint || signature?.fingerprint;
  const securityStatus = plugin.security?.status;
  const importOwner = plugin.security?.importSource?.ownerId;

  return {
    author,
    signature,
    signedAt,
    fingerprint,
    securityStatus,
    importOwner,
  };
}

interface PluginBadgesProps {
  plugin: MacroInfo;
  running?: boolean;
  profileScript?: ProfileScriptInfo | null;
}

export const PluginBadges: React.FC<PluginBadgesProps> = ({
  plugin,
  running,
  profileScript,
}) => {
  const { securityStatus, signature } = getAuthorInfo(plugin, profileScript);
  const sourceKind = profileScript?.source?.kind;

  return (
    <View style={styles.badgeRow}>
      {running ? (
        <Badge
          label="Running"
          color={colors.success}
          bg={colors.successSoft}
          icon={<StatusDot color={colors.success} size={6} pulse />}
        />
      ) : null}

      {plugin.scriptType === 'action' ? (
        <Badge
          label="Action"
          color="#BF5AF2"
          bg="rgba(191,90,242,0.14)"
        />
      ) : null}

      {plugin.language === 'js' ? (
        <Badge
          label="JS"
          color="#FFD60A"
          bg="rgba(255,214,10,0.14)"
        />
      ) : null}

      {plugin.language === 'ts' ? (
        <Badge
          label="TS"
          color="#0A84FF"
          bg="rgba(10,132,255,0.14)"
        />
      ) : null}

      {plugin.language === 'recording' ? (
        <Badge
          label="Recording"
          color="#64D2FF"
          bg="rgba(100,210,255,0.14)"
        />
      ) : null}

      {sourceKind ? (
        <Badge label={SOURCE_LABELS[sourceKind] ?? 'Profile script'} />
      ) : null}

      {securityStatus === 'trusted' ? (
        <Badge
          label="Trusted publisher"
          color={colors.success}
          bg={colors.successSoft}
        />
      ) : securityStatus === 'accepted-once' ? (
        <Badge label="Signed (accepted)" />
      ) : securityStatus === 'modified' ? (
        <Badge
          label="Modified"
          color={colors.warning}
          bg={colors.warningSoft}
        />
      ) : securityStatus === 'unsigned' ? (
        <Badge
          label="Unsigned"
          color={colors.warning}
          bg={colors.warningSoft}
        />
      ) : securityStatus === 'local' ? (
        <Badge label="Local" />
      ) : securityStatus ? (
        <Badge label={securityStatus} />
      ) : signature ? (
        <Badge
          label="Signed"
          color={colors.success}
          bg={colors.successSoft}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
});
