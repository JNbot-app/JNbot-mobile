import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Txt } from '../ui';
import { colors, font, radii, spacing } from '../../theme/theme';
import type { AltWithData } from '../../store/types';

interface AltDetailsCardProps {
  alt: AltWithData;
  serverName?: string;
  lastJoined?: number | null;
  createdOn?: number;
}

export function AltDetailsCard({
  alt,
  serverName,
  lastJoined,
  createdOn,
}: AltDetailsCardProps) {
  const details = [
    {
      label: 'Account type',
      value: alt.data.premium ? 'Microsoft Account' : 'Cracked Account',
      icon: alt.data.premium ? ('diamond-outline' as const) : ('person-outline' as const),
      subvalue: undefined,
    },
    {
      label: 'Server password',
      value: alt.data.password ? 'Configured' : 'None',
      icon: 'key-outline' as const,
    },
    {
      label: 'Active server',
      value: serverName || 'Default Server',
      icon: 'server-outline' as const,
    },
    ...(lastJoined
      ? [
          {
            label: 'Last joined',
            value: new Date(lastJoined).toLocaleString(),
            icon: 'calendar-outline' as const,
          },
        ]
      : []),
    ...(createdOn
      ? [
          {
            label: 'Created on',
            value: new Date(createdOn).toLocaleDateString(),
            icon: 'time-outline' as const,
          },
        ]
      : []),
  ];

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="information-circle-outline" size={17} color={colors.textMuted} />
        <Txt variant="heading" style={styles.title}>
          Account Details
        </Txt>
      </View>

      <View style={styles.list}>
        {details.map((item, index) => (
          <View
            key={item.label}
            style={[
              styles.row,
              index === details.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <View style={styles.labelCol}>
              <Ionicons name={item.icon} size={15} color={colors.textFaint} />
              <Txt variant="muted" style={styles.label}>
                {item.label}
              </Txt>
            </View>
            <View style={styles.valueCol}>
              <Txt variant="body" style={styles.value} numberOfLines={1}>
                {item.value}
              </Txt>
              {item.subvalue ? (
                <Txt variant="faint" style={styles.subvalue} numberOfLines={1}>
                  {item.subvalue}
                </Txt>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: font.size.md,
    fontWeight: '600',
  },
  list: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  labelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  label: {
    fontSize: font.size.caption,
    color: colors.textMuted,
  },
  valueCol: {
    alignItems: 'flex-end',
    flexShrink: 1,
  },
  value: {
    fontSize: font.size.caption,
    fontWeight: '500',
    color: colors.text,
  },
  subvalue: {
    fontSize: 11,
    color: colors.textFaint,
  },
});
