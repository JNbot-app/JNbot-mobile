import React, { memo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MCAvatar } from '../../components/MCAvatar';
import { IconButton, Txt } from '../../components/ui';
import { colors, font, radii, spacing } from '../../theme/theme';
import type { ImportEntry } from './importTypes';

interface Props {
  entry: ImportEntry;
  onUpdatePassword: (username: string, password: string) => void;
  onDelete: (username: string) => void;
  canImportRanksGkits?: boolean;
  onlineMode?: boolean;
}

export const AltImportPreviewRow = memo(function AltImportPreviewRow({
  entry,
  onUpdatePassword,
  onDelete,
  canImportRanksGkits,
  onlineMode = false,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const ranksCount = Object.values(entry.ranks ?? {}).filter(Boolean).length;
  const gkitsCount = Object.values(entry.gkits ?? {}).reduce(
    (acc, list) => acc + (list?.length || 0),
    0,
  );

  const hasExtra = canImportRanksGkits && (ranksCount > 0 || gkitsCount > 0);
  const extraText = hasExtra
    ? `${ranksCount} rank${ranksCount === 1 ? '' : 's'} · ${gkitsCount} gkit${gkitsCount === 1 ? '' : 's'}`
    : entry.premium
      ? 'Premium'
      : 'Cracked';

  return (
    <View style={styles.row}>
      <MCAvatar username={entry.username} size={38} radius={8} />

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Txt variant="heading" numberOfLines={1} style={styles.username}>
            {entry.username}
          </Txt>
          {entry.premium ? (
            <Ionicons name="diamond" size={13} color={colors.info} />
          ) : null}
        </View>
        <Txt variant="faint" numberOfLines={1}>
          {extraText}
        </Txt>

        {!onlineMode ? <View style={styles.passwordContainer}>
          <TextInput
            value={entry.password}
            onChangeText={(val) => onUpdatePassword(entry.username, val)}
            placeholder="Enter password"
            placeholderTextColor={colors.textFaint}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.passwordInput}
          />
          <Pressable
            hitSlop={8}
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.eyeBtn}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={16}
              color={colors.textMuted}
            />
          </Pressable>
        </View> : null}
      </View>

      <IconButton
        accessibilityLabel={`Remove ${entry.username}`}
        bg="transparent"
        size={36}
        onPress={() => onDelete(entry.username)}
      >
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
      </IconButton>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: font.size.base,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginTop: 2,
  },
  passwordInput: {
    flex: 1,
    color: colors.text,
    fontSize: font.size.caption,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  eyeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});
