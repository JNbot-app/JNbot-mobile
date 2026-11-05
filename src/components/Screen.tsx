import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { ScreenSafeArea } from './ScreenSafeArea';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, font, radii, spacing, useTheme } from '../theme/theme';
import { IconButton, Txt } from './ui';
import { ConnectionPill } from './ConnectionPill';
import { selectCanUsePlugins, useStore } from '../store/store';
import { ProfileIcon } from './ProfileIcon';
import { useFeedback } from './AppFeedback';
import { useSafeBack } from '../hooks/useSafeBack';
import { BottomSheet } from './BottomSheet';
import { NativeIcon } from './NativeIcon';
import { JNbotLogo } from './JNbotLogo';
import { ScreenBackground } from './ScreenBackground';
import { DropboxStorageIndicator } from './DropboxStorageIndicator';

type MenuPath = '/(app)/profiles' | '/(app)/plugin-marketplace' | '/(app)/logs' | '/(app)/settings' | '/(app)/shop' | '/(app)/info';

// Material 3 NavigationBar height; the system inset is added on top.
const ANDROID_TAB_BAR_HEIGHT = 80;

export function Screen({
  title,
  subtitle,
  children,
  right,
  back = false,
  onBack,
  beforeNavigate,
  showNotifications = false,
  gradient = false,
  menu = !back,
  edges = ['top', 'left', 'right'],
  tabBar = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  back?: boolean;
  onBack?: () => void;
  beforeNavigate?: (navigate: () => void) => void;
  showNotifications?: boolean;
  gradient?: boolean;
  /** Profile/notification menu in the header; hidden on pushed screens by default. */
  menu?: boolean;
  edges?: readonly Edge[];
  /** Screen lives under the native tab bar. Android sizes tab content to the full window, so reserve the bar's height. */
  tabBar?: boolean;
}) {
  const { theme } = useTheme();
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { openNotifications } = useFeedback();
  const unread = useStore((state) => state.unread);
  const profile = useStore((state) => state.profiles.find((item) => item.id === state.activeProfileKey));
  return (
    <ScreenSafeArea key={theme} style={styles.safe} edges={edges}>
      {gradient ? <ScreenBackground theme={theme} /> : null}
      <View style={[styles.header, back && styles.compactHeader]}>
        {back ? <BackButton onPress={onBack} /> : null}
        <View style={[styles.heading, back && styles.compactHeading]}>
          <Txt style={[styles.title, back && styles.compactTitle]} numberOfLines={1}>{title}</Txt>
          {subtitle ? <Txt variant="muted" numberOfLines={1} style={styles.subtitle}>{subtitle}</Txt> : null}
        </View>
        <View style={styles.headerRight}>
          {right}
          {menu ? (
            <HeaderOverflow
              profile={profile}
              unread={unread}
              showNotifications={showNotifications}
              onNotifications={openNotifications}
              onNavigate={(path) => {
                const navigate = () => router.push(path);
                if (beforeNavigate) beforeNavigate(navigate);
                else navigate();
              }}
            />
          ) : null}
        </View>
      </View>
      <View style={[styles.body, tabBar && Platform.OS === 'android' && { paddingBottom: ANDROID_TAB_BAR_HEIGHT + bottom }]}>{children}</View>
    </ScreenSafeArea>
  );
}

export function BackButton({ onPress, label = 'Back' }: { onPress?: () => void; label?: string }) {
  const goBack = useSafeBack();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={10} onPress={onPress ?? goBack}>
      <Ionicons name="chevron-back" size={27} color={colors.text} />
    </Pressable>
  );
}

function HeaderOverflow({
  profile,
  unread,
  showNotifications,
  onNotifications,
  onNavigate,
}: {
  profile?: { name: string; shortName?: string; icon?: string | null; color?: string };
  unread: number;
  showNotifications: boolean;
  onNotifications: () => void;
  onNavigate: (path: MenuPath) => void;
}) {
  const [open, setOpen] = useState(false);
  const canUsePlugins = useStore(selectCanUsePlugins);
  const navigate = (path: MenuPath) => {
    setOpen(false);
    onNavigate(path);
  };
  return (
    <>
      <DropboxStorageIndicator onPress={() => navigate('/(app)/settings')} />
      {showNotifications ? (
        <View>
          <IconButton accessibilityLabel="Open notifications" bg="transparent" onPress={onNotifications}>
            <NativeIcon sf={unread ? 'bell.fill' : 'bell'} material={unread ? 'notifications' : 'notifications-none'} size={22} color={unread ? colors.primary : colors.text} />
          </IconButton>
          {unread ? <View style={styles.unreadDot} /> : null}
        </View>
      ) : null}
      <IconButton accessibilityLabel="Open account and settings" bg="transparent" onPress={() => setOpen(true)}>
        <ProfileIcon uri={profile?.icon} color={profile?.color ?? colors.primary} size={30} radius={9} />
      </IconButton>
      <BottomSheet visible={open} onClose={() => setOpen(false)} accessibilityLabel="Page menu">
        <View style={styles.menu}>
          <View style={styles.menuHeader}>
            <JNbotLogo size={36} style={{ marginRight: spacing.sm }} />
            <View style={{ flex: 1 }}><Txt variant="heading">JNbot</Txt><Txt variant="muted">Account & runtime</Txt></View>
            <ConnectionPill />
          </View>
          <MenuRow
            icon={<ProfileIcon uri={profile?.icon} color={profile?.color} size={28} radius={9} />}
            title={profile?.shortName ?? profile?.name ?? 'Profiles'}
            subtitle="Choose the profile to manage"
            onPress={() => navigate('/(app)/profiles')}
          />
          {canUsePlugins ? <MenuRow icon={<NativeIcon sf="storefront" material="storefront" size={21} color={colors.text} />} title="Marketplace" subtitle="Install plugins, profiles, chains and more" onPress={() => navigate('/(app)/plugin-marketplace')} /> : null}
          <MenuRow icon={<NativeIcon sf="terminal" material="terminal" size={21} color={colors.text} />} title="Console logs" subtitle="Search and filter runtime output" onPress={() => navigate('/(app)/logs')} />
          {Platform.OS === 'android' ? <MenuRow icon={<NativeIcon sf="bag" material="shopping-bag" size={21} color={colors.text} />} title="Shop" subtitle="Remove ads and restore purchases" onPress={() => navigate('/(app)/shop')} /> : null}
          <MenuRow icon={<NativeIcon sf="gearshape" material="settings" size={21} color={colors.text} />} title="Settings" subtitle="Runtime, server, proxy, and app" onPress={() => navigate('/(app)/settings')} />
          <MenuRow icon={<NativeIcon sf="info.circle" material="info-outline" size={21} color={colors.text} />} title="Info" subtitle="About JNbot, resources, and community" onPress={() => navigate('/(app)/info')} />
        </View>
      </BottomSheet>
    </>
  );
}

function MenuRow({ icon, title, subtitle, onPress }: { icon: React.ReactNode; title: string; subtitle: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed && { backgroundColor: colors.surfaceHover }]}>
    <View style={styles.menuIcon}>{icon}</View>
    <View style={{ flex: 1 }}><Txt variant="heading" numberOfLines={1}>{title}</Txt><Txt variant="faint" numberOfLines={1}>{subtitle}</Txt></View>
    <NativeIcon sf="chevron.right" material="chevron-right" size={17} color={colors.textFaint} />
  </Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  compactHeader: { alignItems: 'center', paddingTop: spacing.xs, paddingLeft: spacing.xs },
  heading: { flex: 1, minWidth: 0 },
  compactHeading: { alignSelf: 'center' },
  title: { fontSize: font.size.xxl, lineHeight: 40, letterSpacing: -1, fontWeight: font.weight.bold, color: colors.text },
  compactTitle: { fontSize: font.size.xl, lineHeight: 28, letterSpacing: -0.3 },
  subtitle: { marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  unreadDot: { position: 'absolute', top: -1, right: -1, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.bg },
  menu: { width: '100%', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  menuHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingBottom: spacing.md },
  menuRow: { minHeight: process.env.EXPO_OS === 'android' ? 60 : 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radii.md, borderCurve: 'continuous' },
  menuIcon: { width: 34, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
});
