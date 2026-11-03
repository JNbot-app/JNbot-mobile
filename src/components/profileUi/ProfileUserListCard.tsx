import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card, Txt } from '../ui';
import { MCAvatar } from '../MCAvatar';
import { colors, font, radii, spacing } from '../../theme/theme';
import type {
  UserListItem,
  UserListSectionData,
} from '../../generated/client-contract/profileUiSchema';

function UserRow({
  user,
  onPress,
}: {
  user: UserListItem;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={() => {
        if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
        onPress?.();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View>
        <MCAvatar username={user.username} size={32} />
        {user.online ? <View style={styles.onlineDot} /> : null}
      </View>
      <Txt variant="body" style={styles.username} numberOfLines={1}>
        {user.username}
      </Txt>
      {user.extra ? (
        <Txt variant="faint" numberOfLines={1} style={styles.extra}>
          {user.extra}
        </Txt>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textFaint} /> : null}
    </Pressable>
  );
}

export function ProfileUserListCard({
  data,
  onSelectUser,
}: {
  data: UserListSectionData;
  onSelectUser?: (username: string) => void;
}) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="people" size={17} color={colors.info} />
          <Txt variant="heading" style={styles.title}>
            {data.title ?? 'Players'}
          </Txt>
        </View>
        <Txt variant="faint">{data.items.length}</Txt>
      </View>

      {data.items.length ? (
        <View>
          {data.items.map((user) => (
            <UserRow
              key={user.username}
              user={user}
              onPress={onSelectUser && (() => onSelectUser(user.username))}
            />
          ))}
        </View>
      ) : (
        <Txt variant="muted" style={styles.empty}>No players</Txt>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: font.size.md,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
  },
  rowPressed: {
    backgroundColor: colors.surfaceHover,
  },
  onlineDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.online,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  username: {
    flex: 1,
    fontSize: font.size.base,
    fontWeight: '500',
  },
  extra: {
    maxWidth: '40%',
  },
  empty: {
    color: colors.textFaint,
    fontSize: font.size.caption,
  },
});
