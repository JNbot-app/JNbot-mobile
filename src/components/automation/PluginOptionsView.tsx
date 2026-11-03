import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { NativeIcon } from '../NativeIcon';
import { EmptyState, Txt } from '../ui';
import { PluginOptionInput, type Choice } from '../PluginOptions';
import type { PluginRunDescriptor, SerializableOption } from '../../runtime/types';
import { colors, font, radii, spacing } from '../../theme/theme';

interface PluginOptionsViewProps {
  descriptor?: PluginRunDescriptor;
  loading?: boolean;
  error?: string | null;
  optionErrors?: Record<string, string>;
  values: Record<string, unknown>;
  collapsed: Record<string, boolean>;
  onToggleCollapse: (sectionId: string) => void;
  onChange: (option: SerializableOption, value: unknown) => void;
  altOptions: Choice[];
  tagOptions: Choice[];
  allOptions: SerializableOption[];
  resolveOptionValue: (
    option: SerializableOption,
    allOptions: SerializableOption[],
    values: Record<string, unknown>,
  ) => unknown;
}

export const PluginOptionsView: React.FC<PluginOptionsViewProps> = ({
  descriptor,
  loading,
  error,
  optionErrors,
  values,
  collapsed,
  onToggleCollapse,
  onChange,
  altOptions,
  tagOptions,
  allOptions,
  resolveOptionValue,
}) => {
  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator color={colors.primary} size="small" />
        <Txt variant="muted" style={{ marginTop: spacing.sm }}>
          Loading script options…
        </Txt>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorBox}>
        <NativeIcon sf="exclamationmark.triangle" material="warning" size={18} color={colors.danger} />
        <Txt variant="muted" style={styles.errorText}>
          {error}
        </Txt>
      </View>
    );
  }

  if (!descriptor) return null;

  const totalOptions = descriptor.sections.reduce(
    (acc, section) => acc + section.options.length,
    0,
  );

  if (totalOptions === 0) {
    return (
      <View style={styles.emptyOptions}>
        <EmptyState
          icon={
            <NativeIcon
              sf="slider.horizontal.3"
              material="tune"
              size={36}
              color={colors.textFaint}
            />
          }
          title="No configurable options"
          subtitle="This plugin runs with its default settings."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!descriptor.allowed && descriptor.blockedReason ? (
        <View style={styles.errorBox}>
          <NativeIcon sf="exclamationmark.triangle" material="warning" size={18} color={colors.danger} />
          <Txt variant="muted" style={styles.errorText}>
            {descriptor.blockedReason}
          </Txt>
        </View>
      ) : null}

      {descriptor.sections.map((section) => {
        const isCollapsed = Boolean(collapsed[section.id]);
        const hasSectionError = section.options.some(
          (opt) => Boolean(optionErrors?.[opt.id]),
        );

        return (
          <View key={section.id} style={styles.section}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${section.name} options`}
              onPress={() => onToggleCollapse(section.id)}
              style={({ pressed }) => [
                styles.sectionHeader,
                pressed && styles.sectionHeaderPressed,
              ]}
            >
              <View style={styles.sectionHeaderLeft}>
                <Txt variant="label" style={styles.sectionTitle}>
                  {section.name}
                </Txt>
                {hasSectionError ? (
                  <View style={styles.errorDot} />
                ) : null}
              </View>
              <NativeIcon
                sf={isCollapsed ? 'chevron.down' : 'chevron.up'}
                material={isCollapsed ? 'expand-more' : 'expand-less'}
                size={18}
                color={colors.textFaint}
              />
            </Pressable>

            {!isCollapsed ? (
              <View style={styles.sectionContent}>
                {section.options.map((option) => {
                  const fieldError = optionErrors?.[option.id];
                  const val = resolveOptionValue(option, allOptions, values);

                  return (
                    <View
                      key={option.id}
                      style={fieldError ? styles.optionError : undefined}
                    >
                      <PluginOptionInput
                        option={option}
                        value={val}
                        altOptions={altOptions}
                        tagOptions={tagOptions}
                        onChange={(next) => onChange(option, next)}
                      />
                      {fieldError ? (
                        <Txt variant="faint" style={styles.optionErrorText}>
                          {fieldError}
                        </Txt>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  centerBox: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
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
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: font.size.caption,
  },
  emptyOptions: {
    paddingVertical: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  sectionHeaderPressed: {
    opacity: 0.7,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: font.size.caption,
    color: colors.textMuted,
  },
  errorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
  },
  sectionContent: {
    gap: spacing.md,
  },
  optionError: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  optionErrorText: {
    color: colors.danger,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
});
