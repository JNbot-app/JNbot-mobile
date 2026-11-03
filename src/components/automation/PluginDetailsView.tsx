import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Txt } from '../ui';
import { NativeIcon } from '../NativeIcon';
import { PluginBadges, getAuthorInfo } from './PluginBadges';
import type { MacroInfo } from '../../store/types';
import type { ProfileScriptInfo } from '../../hooks/useProfileScriptInfos';
import { colors, font, radii, spacing } from '../../theme/theme';

interface PluginDetailsViewProps {
  plugin: MacroInfo;
  running?: boolean;
  profileScript?: ProfileScriptInfo | null;
  blockedReason?: string | null;
}

export const PluginDetailsView: React.FC<PluginDetailsViewProps> = ({
  plugin,
  running,
  profileScript,
  blockedReason,
}) => {
  const {
    author,
    signedAt,
    fingerprint,
    securityStatus,
    importOwner,
  } = getAuthorInfo(plugin, profileScript);

  const formattedFingerprint = fingerprint
    ? fingerprint.match(/.{1,4}/g)?.join(' ') || fingerprint
    : null;

  const sourceUrl =
    profileScript?.source?.kind === 'url' ? (profileScript.source as any).url : undefined;

  const createdDate = plugin.createdAt
    ? new Date(plugin.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const editedDate = plugin.editedAt
    ? new Date(plugin.editedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const signedDate = signedAt
    ? new Date(signedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <View style={styles.container}>
      {/* Top badges */}
      <PluginBadges
        plugin={plugin}
        running={running}
        profileScript={profileScript}
      />

      {/* Blocked / Unavailable alert */}
      {blockedReason ? (
        <View style={styles.blockedCard}>
          <NativeIcon sf="exclamationmark.triangle" material="warning" size={18} color={colors.danger} />
          <Txt variant="muted" style={styles.blockedText}>
            {blockedReason}
          </Txt>
        </View>
      ) : null}

      {/* Description */}
      {plugin.description ? (
        <View style={styles.descriptionBox}>
          <Txt variant="body" selectable style={styles.descriptionText}>
            {plugin.description}
          </Txt>
        </View>
      ) : null}

      {/* Inset Grouped Metadata Table */}
      <View style={styles.metadataCard}>
        <DetailRow label="Plugin ID" value={plugin.pluginId} isFirst mono />

        {author ? (
          <DetailRow
            label="Author"
            value={
              <View style={styles.authorRow}>
                <Txt variant="body" selectable style={styles.valueText}>
                  {author}
                </Txt>
                {securityStatus === 'trusted' ? (
                  <Badge
                    label="Trusted"
                    color={colors.success}
                    bg={colors.successSoft}
                  />
                ) : null}
              </View>
            }
          />
        ) : null}

        {securityStatus ? (
          <DetailRow
            label="Security"
            value={
              securityStatus === 'trusted' ? (
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
              ) : (
                <Badge label={securityStatus} />
              )
            }
          />
        ) : null}

        {signedDate ? (
          <DetailRow label="Signed" value={signedDate} />
        ) : null}

        {formattedFingerprint ? (
          <DetailRow
            label="Fingerprint"
            value={formattedFingerprint}
            mono
          />
        ) : null}

        {importOwner ? (
          <DetailRow label="Owner ID" value={importOwner} />
        ) : null}

        {sourceUrl ? (
          <DetailRow label="Source URL" value={sourceUrl} link />
        ) : null}

        {plugin.language ? (
          <DetailRow
            label="Language"
            value={
              plugin.language === 'js'
                ? 'JavaScript'
                : plugin.language === 'ts'
                ? 'TypeScript'
                : plugin.language === 'recording'
                ? 'Action Recording'
                : 'Components'
            }
          />
        ) : null}

        {createdDate ? (
          <DetailRow label="Created" value={createdDate} />
        ) : null}

        {editedDate ? (
          <DetailRow label="Updated" value={editedDate} />
        ) : null}

        {plugin.downloads !== undefined && plugin.downloads > 0 ? (
          <DetailRow
            label="Downloads"
            value={plugin.downloads.toLocaleString()}
          />
        ) : null}
      </View>
    </View>
  );
};

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
  isFirst?: boolean;
  mono?: boolean;
  link?: boolean;
}

export const DetailRow: React.FC<DetailRowProps> = ({
  label,
  value,
  isFirst,
  mono,
  link,
}) => {
  return (
    <View style={[styles.row, !isFirst && styles.rowBorder]}>
      <Txt variant="muted" style={styles.rowLabel}>
        {label}
      </Txt>
      <View style={styles.rowValueContainer}>
        {typeof value === 'string' ? (
          <Txt
            variant="body"
            selectable
            style={[
              styles.valueText,
              mono && styles.monoText,
              link && styles.linkText,
            ]}
          >
            {value}
          </Txt>
        ) : (
          value
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  descriptionBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
  },
  descriptionText: {
    fontSize: font.size.sm,
    lineHeight: 21,
    color: colors.textMuted,
  },
  blockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    backgroundColor: colors.dangerSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.danger,
  },
  blockedText: {
    flex: 1,
    color: colors.danger,
    fontSize: font.size.caption,
  },
  metadataCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  row: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  rowLabel: {
    width: 90,
    fontSize: font.size.caption,
    fontWeight: font.weight.medium,
    color: colors.textMuted,
  },
  rowValueContainer: {
    flex: 1,
    minWidth: 0,
  },
  valueText: {
    fontSize: font.size.caption,
    color: colors.text,
  },
  monoText: {
    fontSize: font.size.xs,
    letterSpacing: 0.5,
    fontFamily: process.env.EXPO_OS === 'ios' ? 'Courier' : 'monospace',
  },
  linkText: {
    color: colors.primary,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
});
