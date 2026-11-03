import React, { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { Button, Txt } from '../../components/ui';
import { SettingsField, SettingsToggle } from '../../components/settings/SettingsFields';
import { useStore } from '../../store/store';
import { useConnection } from '../../net/ConnectionProvider';
import type { ServerStatus } from '../../runtime/JNbotRuntime';
import type { CreateProfileInput, ProfileCreationAdvanced, ProfileCreationSection } from '../../generated/client-contract/mobileClientContract';
import { ProfileAdvancedEditor } from './ProfileAdvancedEditor';
import { ProfileRow } from './ProfileFormControls';
import { errorMessage, errorSection, guessServerName, parseAddress, PROFILE_SECTIONS, sectionSummary, validateAdvanced } from './profileDraft';
import { colors, radii, spacing } from '../../theme/theme';

type Props = { createProfile: (input: CreateProfileInput) => Promise<void>; onBack: () => void; onCreated: () => void };
type Page = 'basic' | 'advanced' | ProfileCreationSection;
type Lookup = { state: 'idle' | 'checking' | 'offline' } | { state: 'online'; status: ServerStatus };

export function CreateProfileView({ createProfile, onBack, onCreated }: Props) {
  const navigation = useNavigation();
  const plugins = useStore((state) => state.macros.list);
  const versions = useStore((state) => state.JNdata?.versions ?? []);
  const { serverStatus } = useConnection();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lookup, setLookup] = useState<Lookup>({ state: 'idle' });
  const nameAuto = useRef(true);
  const { host, port } = parseAddress(address);
  const [onlineMode, setOnlineMode] = useState(false);
  const [advanced, setAdvanced] = useState<ProfileCreationAdvanced>({});
  const [page, setPage] = useState<Page>('basic');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const submitting = useRef(false);
  const completed = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const configured = PROFILE_SECTIONS.filter((section) => sectionSummary(section.id, advanced)).length;
  const dirty = Boolean(name || address || onlineMode || Object.keys(advanced).length);
  const title = page === 'basic' ? 'Add a server' : page === 'advanced' ? 'More options' : PROFILE_SECTIONS.find((section) => section.id === page)?.title ?? '';

  const confirmDiscard = (discard: () => void) => {
    if (!dirty || completed.current) { discard(); return; }
    Alert.alert('Discard this profile?', 'Your profile has not been created yet.', [
      { text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: discard },
    ]);
  };
  const back = () => {
    if (submitting.current) return;
    setError(null);
    if (page === 'basic') confirmDiscard(onBack);
    else setPage(page === 'advanced' ? 'basic' : 'advanced');
  };
  usePreventRemove(dirty || page !== 'basic' || creating, ({ data }) => {
    if (completed.current) { navigation.dispatch(data.action); return; }
    if (submitting.current) return;
    if (page !== 'basic') { back(); return; }
    confirmDiscard(() => navigation.dispatch(data.action));
  });
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => subscription.remove();
  });
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [page]);
  // Ping the server as the address is typed; fill the name and icon from it.
  useEffect(() => {
    if (!host.includes('.') && host !== 'localhost') { setLookup({ state: 'idle' }); return; }
    let cancelled = false;
    setLookup({ state: 'checking' });
    const timer = setTimeout(() => {
      serverStatus(host, port).then((status) => {
        if (cancelled) return;
        if (!status) { setLookup({ state: 'idle' }); return; }
        setLookup({ state: 'online', status });
        if (nameAuto.current) setName(guessServerName(host));
        if (status.favicon) setAdvanced((prev) => (prev.icon === undefined || prev.icon?.startsWith('data:') ? { ...prev, icon: status.favicon } : prev));
      }).catch(() => !cancelled && setLookup({ state: 'offline' }));
    }, 600);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [host, port, serverStatus]);

  const showError = (message: string) => {
    const section = errorSection(message);
    setPage(section ?? 'basic');
    setError(errorMessage(message));
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const done = () => {
    if (page === 'advanced') { setPage('basic'); setError(null); return; }
    if (page === 'basic') return;
    const validation = validateAdvanced(advanced, plugins, page);
    if (validation) { showError(validation); return; }
    setError(null); setPage('advanced');
  };
  const create = async () => {
    if (submitting.current) return;
    setError(null);
    if (!name.trim() || !host) { showError('Enter a profile name and Minecraft server address.'); return; }
    const validation = validateAdvanced(advanced, plugins);
    if (validation) { showError(validation); return; }
    submitting.current = true; setCreating(true);
    try {
      const input: CreateProfileInput = { name: name.trim(), host, port, onlineMode };
      if (Object.keys(advanced).length) input.advanced = advanced;
      await createProfile(input);
      completed.current = true;
      onCreated();
    } catch (reason) { showError(reason instanceof Error ? reason.message : 'Unable to create this profile.'); }
    finally { submitting.current = false; setCreating(false); }
  };

  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <View style={styles.navigation}>
        <Pressable accessibilityRole="button" accessibilityLabel={page === 'basic' ? 'Back to profiles' : page === 'advanced' ? 'Back to basic options' : 'Back to advanced options'} disabled={creating} onPress={back} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><Ionicons name="chevron-back" size={25} color={colors.text} /></Pressable>
        {page !== 'basic' ? <Txt variant="heading" style={styles.grow}>{title}</Txt> : <View style={styles.grow} />}
        {page !== 'basic' ? <Button title="Done" variant="ghost" onPress={done} /> : null}
      </View>
      <ScrollView ref={scroll} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {page === 'basic' ? <View style={styles.header}><Txt variant="title">Add a server</Txt><Txt variant="muted">Where your bots connect.</Txt></View> : null}
        {error ? <View accessibilityRole="alert" style={styles.error}><Ionicons name="alert-circle" size={18} color={colors.danger} /><Txt variant="muted" style={styles.errorText}>{error}</Txt></View> : null}
        {page === 'basic' ? <>
          <View style={styles.form} pointerEvents={creating ? 'none' : 'auto'}>
            <View style={styles.field}>
              <SettingsField label="Server address" value={address} onChangeText={setAddress} placeholder="play.example.net" autoCapitalize="none" keyboardType="url" />
              <LookupLine lookup={lookup} />
            </View>
            <SettingsField label="Name" value={name} onChangeText={(next) => { nameAuto.current = false; setName(next); }} placeholder="My server" autoCapitalize="words" />
            <SettingsToggle label="Premium server" description="Only paid Minecraft accounts can join" value={onlineMode} onChange={setOnlineMode} />
          </View>
          <View style={styles.list} pointerEvents={creating ? 'none' : 'auto'}><ProfileRow title="More options" summary={configured ? `${configured} sections configured` : undefined} onPress={() => setPage('advanced')} /></View>
          <Button title={creating ? 'Creating profile…' : 'Create profile'} loading={creating} disabled={creating} full onPress={() => void create()} />
          <Txt variant="faint" style={styles.hint}>You can add accounts after the profile is created.</Txt>
        </> : page === 'advanced' ? <View style={styles.list}>{PROFILE_SECTIONS.map((section) => <ProfileRow key={section.id} title={section.title} summary={sectionSummary(section.id, advanced)} onPress={() => { setPage(section.id); setError(null); }} />)}</View> : <ProfileAdvancedEditor section={page} value={advanced} onChange={setAdvanced} plugins={plugins} versions={versions} host={host} port={String(port)} />}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
function LookupLine({ lookup }: { lookup: Lookup }) {
  if (lookup.state === 'idle') return null;
  if (lookup.state !== 'online') return <Txt variant="faint">{lookup.state === 'checking' ? 'Looking up server…' : "Couldn't reach this server right now"}</Txt>;
  const { version, online } = lookup.status;
  return <View style={styles.lookup}>
    <View style={styles.dot} />
    <Txt variant="faint">{['Online', version, online !== undefined && `${online.toLocaleString()} playing`].filter(Boolean).join(' · ')}</Txt>
  </View>;
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  lookup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  safe: { flex: 1, backgroundColor: colors.bg }, flex: { flex: 1 }, grow: { flex: 1 },
  scroll: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  navigation: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  backButton: { width: Platform.OS === 'android' ? 48 : 44, height: Platform.OS === 'android' ? 48 : 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
  pressed: { backgroundColor: colors.surfaceHover }, header: { gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.sm },
  form: { gap: spacing.lg, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.surface },
  list: { overflow: 'hidden', borderRadius: radii.lg, backgroundColor: colors.surface },
  error: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.dangerSoft },
  errorText: { flex: 1, color: colors.danger }, hint: { textAlign: 'center', lineHeight: 18 },
});
