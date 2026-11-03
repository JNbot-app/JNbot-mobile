import React, { useEffect, useState } from 'react';
import { Linking, Modal, ScrollView, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { actions, useStore } from '../store/store';
import { Button, Card, Txt } from './ui';
import { colors, radii, spacing } from '../theme/theme';

export function MicrosoftLoginModal() {
  const login = useStore((state) => state.microsoftLogin);
  const joined = useStore((state) => !!login?.username && state.activeBots.some(
    (bot) => bot.status === 'connected' && bot.username.toLowerCase() === login.username?.toLowerCase(),
  ));
  useEffect(() => {
    if (joined) actions.clearMicrosoftLogin();
  }, [joined]);
  const [now, setNow] = useState(Date.now);
  const expiresAt = login && typeof login.expiresIn === 'number' && Number.isFinite(login.expiresIn)
    ? login.receivedAt + Math.max(0, login.expiresIn) * 1000
    : undefined;

  useEffect(() => {
    if (!login || expiresAt === undefined) return;
    setNow(Date.now());
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= expiresAt) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [login, expiresAt]);

  if (!login) return null;
  const seconds = expiresAt === undefined ? undefined : Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const expired = seconds === 0;
  const feedback = (title: string, type: 'success' | 'error') => actions.enqueueToast({
    id: `microsoft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title, type,
  });
  const copy = async (value: string, label: string) => {
    try {
      if (!await Clipboard.setStringAsync(value)) throw new Error('Clipboard unavailable');
      feedback(`${label} copied`, 'success');
    } catch {
      feedback('Could not copy. Select and copy the text manually.', 'error');
    }
  };
  const open = async () => {
    try {
      await Linking.openURL(login.verificationUri);
    } catch {
      feedback('Could not open Microsoft. Copy the URL and open it in your browser.', 'error');
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={actions.clearMicrosoftLogin}>
      <View style={styles.backdrop}>
        <Card style={styles.card}>
          <ScrollView contentContainerStyle={styles.content}>
            <Txt variant="title">Sign in to Microsoft</Txt>
            <Txt variant="muted">
              {login.username ? `Sign in for ${login.username}. ` : ''}Open the verification URL and enter this code. To sign in on another device, send the URL and code together.
            </Txt>
            <View style={styles.codeBox}>
              <Txt variant="muted">Device code</Txt>
              <Txt variant="none" style={styles.code} selectable>{login.userCode}</Txt>
              <Button title="Copy code" small variant="secondary" disabled={expired || !login.userCode} onPress={() => void copy(login.userCode, 'Code')} />
              {seconds !== undefined && <Txt variant="muted" style={expired ? { color: colors.danger } : undefined}>
                {expired ? 'Code expired. Start sign-in again to get a new code.' : `Expires in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`}
              </Txt>}
            </View>
            <View style={styles.urlBox}>
              <Txt variant="heading">Verification URL</Txt>
              <Txt selectable>{login.verificationUri}</Txt>
              <Button title="Copy verification URL" small variant="ghost" disabled={expired || !login.verificationUri} onPress={() => void copy(login.verificationUri, 'URL')} />
            </View>
            <View style={styles.buttons}>
              <Button title="Open Microsoft" full disabled={expired || !login.verificationUri || !login.userCode} icon={<Ionicons name="open-outline" size={17} color={colors.primaryOn} />} onPress={() => void open()} />
              <Button title="Copy URL and code" full variant="secondary" disabled={expired || !login.verificationUri || !login.userCode} onPress={() => void copy(`${login.verificationUri}\nCode: ${login.userCode}`, 'URL and code')} />
              <Button title="Close" full variant="ghost" onPress={actions.clearMicrosoftLogin} />
            </View>
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.overlay },
  card: { width: '100%', maxWidth: 440, maxHeight: '90%', alignSelf: 'center', backgroundColor: colors.bgElevated },
  content: { gap: spacing.lg },
  codeBox: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg, borderRadius: radii.md, backgroundColor: colors.surface },
  code: { color: colors.text, fontSize: 28, lineHeight: 38, fontWeight: '700', letterSpacing: 3, textAlign: 'center' },
  urlBox: { gap: spacing.sm },
  buttons: { gap: spacing.sm },
});
