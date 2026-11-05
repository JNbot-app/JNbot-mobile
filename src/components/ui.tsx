import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewProps,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, font, radii, spacing, palette } from '../theme/theme';
import { NativeIcon } from './NativeIcon';

// ── Text ─────────────────────────────────────────────────────────────────────

type TxtVariant = 'title' | 'heading' | 'body' | 'muted' | 'faint' | 'label' | 'none';
const txtStyle = StyleSheet.create({
  title: { fontSize: font.size.xxl, fontWeight: font.weight.bold, color: colors.text },
  heading: { fontSize: font.size.lg, fontWeight: font.weight.semibold, color: colors.text },
  body: { fontSize: font.size.md, lineHeight: 22, color: colors.text },
  muted: { fontSize: font.size.sm, lineHeight: 19, color: colors.textMuted },
  faint: { fontSize: font.size.xs, color: colors.textFaint },
  label: {
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    color: colors.textMuted,
  },
  none: {},
});

export function Txt({
  variant = 'body',
  style,
  ...rest
}: TextProps & { variant?: TxtVariant }) {
  return <Text {...rest} style={[txtStyle[variant], style]} />;
}

// ── Card ─────────────────────────────────────────────────────────────────────

export function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[styles.card, style]}>
      {children}
    </View>
  );
}

export function PressableCard({
  style,
  children,
  onPress,
  ...rest
}: PressableProps) {
  return (
    <Pressable
      onPress={(e) => {
        if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.card,
        pressed && { backgroundColor: colors.surfaceHover },
        style as object,
      ]}
      {...rest}
    >
      {children as React.ReactNode}
    </Pressable>
  );
}

// ── Status dot ───────────────────────────────────────────────────────────────

export function StatusDot({
  color,
  size = 9,
  pulse,
}: {
  color: string;
  size?: number;
  pulse?: boolean;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: pulse ? 1 : 0.92,
      }}
    />
  );
}

// ── Badge / pill ─────────────────────────────────────────────────────────────

export function Badge({
  label,
  color,
  bg,
  icon,
}: {
  label: string;
  color?: string;
  bg?: string;
  icon?: React.ReactNode;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: bg ?? colors.surfaceAlt }]}>
      {icon}
      <Text style={[styles.badgeText, { color: color ?? colors.textMuted }]}>{label}</Text>
    </View>
  );
}

// ── Button ───────────────────────────────────────────────────────────────────

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
function getBtnColors(variant: BtnVariant): { bg: string; fg: string; border?: string } {
  switch (variant) {
    case 'primary':
      return { bg: colors.primary, fg: colors.primaryOn };
    case 'success':
      return { bg: colors.success, fg: palette.white };
    case 'danger':
      return { bg: colors.dangerSoft, fg: colors.danger, border: colors.danger };
    case 'secondary':
      return { bg: colors.surfaceAlt, fg: colors.text, border: colors.border };
    case 'ghost':
      return { bg: 'transparent', fg: colors.textMuted };
  }
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  full,
  small,
  style,
  hitSlop,
  accessibilityLabel,
}: {
  title: string;
  accessibilityLabel?: string;
  onPress?: () => void;
  variant?: BtnVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  full?: boolean;
  small?: boolean;
  style?: object;
  hitSlop?: PressableProps["hitSlop"];
}) {
  const c = getBtnColors(variant);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      disabled={disabled || loading}
      hitSlop={hitSlop}
      onPress={() => {
        if (disabled || loading) return;
        if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.btn,
        small && { paddingVertical: 9, paddingHorizontal: 14 },
        {
          backgroundColor: c.bg,
          borderColor: c.border ?? 'transparent',
          borderWidth: c.border ? 1 : 0,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        full && { alignSelf: 'stretch' },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.fg} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.btnText, { color: c.fg, fontSize: small ? font.size.caption : font.size.base }]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// ── Icon button ──────────────────────────────────────────────────────────────

export function IconButton({
  onPress,
  children,
  bg,
  size = process.env.EXPO_OS === 'android' ? 48 : 44,
  disabled,
  style,
  accessibilityLabel,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  bg?: string;
  size?: number;
  disabled?: boolean;
  style?: object;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.iconBtn,
        {
          width: size,
          height: size,
          backgroundColor: bg ?? colors.surfaceAlt,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

/** Primary "add / create" action for screen headers. */
export function AddButton({
  onPress,
  disabled,
  accessibilityLabel,
}: {
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <IconButton bg={colors.primary} accessibilityLabel={accessibilityLabel} disabled={disabled} onPress={onPress}>
      <NativeIcon sf="plus" material="add" size={24} color={colors.primaryOn} />
    </IconButton>
  );
}

// ── Section header ───────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  right,
  count,
}: {
  title: string;
  right?: React.ReactNode;
  count?: number;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Txt variant="heading" numberOfLines={2}>{title}</Txt>
        {typeof count === 'number' && (
          <View style={styles.countPill}>
            <Text style={styles.countText}>{count}</Text>
          </View>
        )}
      </View>
      {right}
    </View>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  subtitle,
  compact,
  actionLabel,
  onAction,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Tighter padding for use inside a card/group. */
  compact?: boolean;
}) {
  return (
    <View style={[styles.empty, compact && styles.emptyCompact]}>
      {icon}
      <Txt variant="heading" style={{ marginTop: spacing.md, textAlign: 'center' }}>
        {title}
      </Txt>
      {subtitle && (
        <Txt variant="muted" style={{ marginTop: 6, textAlign: 'center', maxWidth: 300 }}>
          {subtitle}
        </Txt>
      )}
      {onAction && actionLabel ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.emptyAction}>
          <Txt variant="heading" style={{ color: colors.primary }}>{actionLabel}</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

// ── Divider ──────────────────────────────────────────────────────────────────

export const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
    borderCurve: 'continuous',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: radii.md,
    minHeight: process.env.EXPO_OS === 'android' ? 48 : 44,
    borderCurve: 'continuous',
  },
  btnText: { fontWeight: '600' },
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderCurve: 'continuous',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
  },
  countPill: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: spacing.xl,
  },
  emptyAction: { marginTop: spacing.sm, minHeight: process.env.EXPO_OS === 'android' ? 48 : 44, justifyContent: 'center', paddingHorizontal: spacing.lg },
  emptyCompact: { paddingVertical: spacing.xl },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: 0,
  },
});
