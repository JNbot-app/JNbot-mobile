import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Button, Txt } from '../../components/ui';
import { useConnection } from '../../net/ConnectionProvider';
import { useStore } from '../../store/store';
import { colors, font, radii, spacing } from '../../theme/theme';
import { consumeScannedInstanceImportUrl } from '../../runtime/instanceTransfer';
import { DirectTransferGuide } from './DirectTransferGuide';

type Props = {
  onBack: () => void;
  onImported: () => void;
};

type ImportMethod = 'direct' | 'cloud' | 'file';

export function ImportDesktopView({ onBack, onImported }: Props) {
  const router = useRouter();
  const { importDesktopInstance, importFullInstance } = useConnection();
  const [method, setMethod] = useState<ImportMethod>('direct');
  const [showMethods, setShowMethods] = useState(false);

  // Cloud state
  const [userId, setUserId] = useState('');
  const [shareKey, setShareKey] = useState('');
  const [showShareKey, setShowShareKey] = useState(false);

  // File state
  const [fileAsset, setFileAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [filePassword, setFilePassword] = useState('');
  const [showFilePassword, setShowFilePassword] = useState(false);

  // General state
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [directStage, setDirectStage] = useState<string | null>(null);

  const importDirect = useCallback(
    async (url: string) => {
      setImporting(true);
      setError(null);
      try {
        await importDesktopInstance(url, (stage, percent) =>
          setDirectStage(stage === 'Downloading' ? `Downloading ${percent ?? 0}%` : stage),
        );
        onImported();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Failed to import directly from desktop.');
      } finally {
        setDirectStage(null);
        setImporting(false);
      }
    },
    [importDesktopInstance, onImported],
  );

  const promptConfirm = useCallback((execute: () => Promise<void>) => {
    // Nothing to overwrite on a fresh phone, so skip the warning.
    if (!useStore.getState().profiles.length) {
      void execute();
      return;
    }
    Alert.alert(
      'Overwrite all data on this device?',
      'Importing this instance will replace all existing profiles, accounts, settings, and plugins on this phone with the data from your desktop.\n\nAll existing local data will be permanently overwritten. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Overwrite & Import',
          style: 'destructive',
          onPress: () => {
            void execute();
          },
        },
      ],
      { cancelable: true },
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      const url = consumeScannedInstanceImportUrl();
      if (!url) return;
      promptConfirm(() => importDirect(url));
    }, [importDirect, promptConfirm]),
  );

  const pickBackupFile = async () => {
    setError(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (res.canceled || !res.assets || !res.assets.length) return;

      const asset = res.assets[0];
      const file = new File(asset.uri);
      const text = await file.text();

      try {
        JSON.parse(text);
      } catch {
        setError('The selected file is not a valid JSON backup.');
        return;
      }

      setFileAsset(asset);
      setFileContent(text);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to read selected file.');
    }
  };

  const handleImport = async () => {
    setError(null);

    if (method === 'direct') {
      router.push({ pathname: '/scan', params: { purpose: 'instance-import' } });
      return;
    }
    if (method === 'cloud') {
      const cleanUid = userId.trim();
      const cleanKey = shareKey.trim();
      if (!cleanUid) {
        setError('Enter your JNbot Cloud User ID.');
        return;
      }
      if (!cleanKey) {
        setError('Enter your JNbot Cloud Share Key or Password.');
        return;
      }

      promptConfirm(async () => {
        setImporting(true);
        try {
          await importFullInstance({
            type: 'cloud',
            userId: cleanUid,
            password: cleanKey,
          });
          onImported();
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : 'Failed to import from JNbot Cloud.');
        } finally {
          setImporting(false);
        }
      });
    } else {
      if (!fileContent) {
        setError('Choose a backup .json file first.');
        return;
      }

      promptConfirm(async () => {
        setImporting(true);
        try {
          await importFullInstance({
            type: 'file',
            fileContent,
            password: filePassword.trim() || undefined,
          });
          onImported();
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : 'Failed to import backup file.');
        } finally {
          setImporting(false);
        }
      });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getButtonTitle = () => {
    if (importing) {
      if (method === 'direct') return directStage || 'Importing instance…';
      if (method === 'cloud') return 'Importing from Cloud…';
      return 'Importing backup…';
    }
    if (method === 'direct') return 'Scan Desktop QR';
    if (method === 'cloud') return 'Import from Cloud';
    return 'Import Backup File';
  };

  const getButtonIcon = () => {
    if (importing) return undefined;
    if (method === 'direct') {
      return <Ionicons name="qr-code-outline" size={18} color={colors.primaryOn} />;
    }
    if (method === 'cloud') {
      return <Ionicons name="cloud-download-outline" size={18} color={colors.primaryOn} />;
    }
    return <Ionicons name="document-text-outline" size={18} color={colors.primaryOn} />;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.navigation}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={onBack}
              disabled={importing}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={25} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.header}>
            <Txt variant="title">Import from desktop</Txt>
            <Txt variant="muted">
              Restore your complete JNbot configuration from desktop or backup.
            </Txt>
          </View>

          {/* Method Tabs */}
          {showMethods ? <View style={styles.tabsWrap}>
            <View accessibilityRole="tablist" style={styles.tabs}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: method === 'direct' }}
                onPress={() => {
                  setError(null);
                  setMethod('direct');
                }}
                disabled={importing}
                style={[styles.tab, method === 'direct' && styles.tabSelected]}
              >
                <Ionicons
                  name="desktop-outline"
                  size={18}
                  color={method === 'direct' ? colors.text : colors.textMuted}
                  style={styles.tabIcon}
                />
                <Txt variant="label" style={method === 'direct' ? styles.tabLabelSelected : undefined}>
                  Direct
                </Txt>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: method === 'cloud' }}
                onPress={() => {
                  setError(null);
                  setMethod('cloud');
                }}
                disabled={importing}
                style={[styles.tab, method === 'cloud' && styles.tabSelected]}
              >
                <Ionicons
                  name="cloud-outline"
                  size={18}
                  color={method === 'cloud' ? colors.text : colors.textMuted}
                  style={styles.tabIcon}
                />
                <Txt variant="label" style={method === 'cloud' ? styles.tabLabelSelected : undefined}>
                  JNbot Cloud
                </Txt>
              </Pressable>

              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: method === 'file' }}
                onPress={() => {
                  setError(null);
                  setMethod('file');
                }}
                disabled={importing}
                style={[styles.tab, method === 'file' && styles.tabSelected]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={method === 'file' ? colors.text : colors.textMuted}
                  style={styles.tabIcon}
                />
                <Txt variant="label" style={method === 'file' ? styles.tabLabelSelected : undefined}>
                  Backup File
                </Txt>
              </Pressable>
            </View>
          </View> : null}

          {/* Method Content */}
          {method === 'direct' ? (
            <DirectTransferGuide importing={importing} directStage={directStage} />
          ) : method === 'cloud' ? (
            <View style={styles.section}>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                <Txt variant="faint" style={styles.infoText}>
                  On JNbot Desktop, navigate to Settings → Cloud Storage to view or generate your User
                  ID and Share Key.
                </Txt>
              </View>

              <View style={styles.form}>
                <Field label="Cloud User ID">
                  <TextInput
                    value={userId}
                    onChangeText={setUserId}
                    placeholder="Enter your user ID"
                    placeholderTextColor={colors.textFaint}
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    autoComplete="off"
                    textContentType="none"
                    editable={!importing}
                  />
                </Field>

                <Field label="Share Key / Password">
                  <View style={styles.passwordRow}>
                    <TextInput
                      value={shareKey}
                      onChangeText={setShareKey}
                      placeholder="ABCDE-FGHIJ-KLMNO-PQRST-UVWXY"
                      placeholderTextColor={colors.textFaint}
                      style={[styles.input, styles.passwordInput]}
                      secureTextEntry={!showShareKey}
                      autoCapitalize="none"
                      autoCorrect={false}
                      spellCheck={false}
                      autoComplete="off"
                      textContentType="none"
                      editable={!importing}
                    />
                    <Pressable
                      onPress={() => setShowShareKey(!showShareKey)}
                      style={styles.eyeButton}
                      accessibilityRole="button"
                      accessibilityLabel={showShareKey ? 'Hide key' : 'Show key'}
                    >
                      <Ionicons
                        name={showShareKey ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  </View>
                </Field>
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                <Txt variant="faint" style={styles.infoText}>
                  Select the JNbotBackup.json file exported from JNbot Desktop (Settings → Export
                  Settings).
                </Txt>
              </View>

              <View style={styles.form}>
                <View style={styles.field}>
                  <Txt variant="label">Backup File (.json)</Txt>
                  {fileAsset ? (
                    <View style={styles.selectedFileCard}>
                      <View style={styles.fileIconWrap}>
                        <Ionicons name="document-text" size={26} color={colors.primary} />
                      </View>
                      <View style={styles.fileDetails}>
                        <Txt variant="heading" numberOfLines={1} style={styles.fileName}>
                          {fileAsset.name}
                        </Txt>
                        <Txt variant="faint">
                          {formatFileSize(fileAsset.size ?? undefined)} · Ready to restore
                        </Txt>
                      </View>
                      <Pressable
                        onPress={() => void pickBackupFile()}
                        disabled={importing}
                        style={styles.changeFileButton}
                      >
                        <Txt variant="label" style={styles.changeFileText}>
                          Change
                        </Txt>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Choose backup file"
                      onPress={() => void pickBackupFile()}
                      disabled={importing}
                      style={({ pressed }) => [styles.pickBox, pressed && styles.pressed]}
                    >
                      <View style={styles.pickIconWrap}>
                        <Ionicons name="folder-open-outline" size={26} color={colors.primary} />
                      </View>
                      <Txt variant="heading">Choose Backup File</Txt>
                      <Txt variant="faint">Tap to select a .json backup from your device</Txt>
                    </Pressable>
                  )}
                </View>

                <Field label="Custom Password (Optional)">
                  <View style={styles.passwordRow}>
                    <TextInput
                      value={filePassword}
                      onChangeText={setFilePassword}
                      placeholder="Leave empty if no custom password was set"
                      placeholderTextColor={colors.textFaint}
                      style={[styles.input, styles.passwordInput]}
                      secureTextEntry={!showFilePassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      spellCheck={false}
                      autoComplete="off"
                      textContentType="none"
                      editable={!importing}
                    />
                    <Pressable
                      onPress={() => setShowFilePassword(!showFilePassword)}
                      style={styles.eyeButton}
                      accessibilityRole="button"
                      accessibilityLabel={showFilePassword ? 'Hide password' : 'Show password'}
                    >
                      <Ionicons
                        name={showFilePassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  </View>
                </Field>
              </View>
            </View>
          )}

          {!showMethods ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowMethods(true)}
              disabled={importing}
              style={({ pressed }) => [styles.otherMethods, pressed && styles.pressed]}
            >
              <Txt variant="label" style={styles.changeFileText}>Use JNbot Cloud or a backup file instead</Txt>
            </Pressable>
          ) : null}

          {error ? (
            <View accessibilityRole="alert" style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Txt variant="muted" style={styles.errorText}>
                {error}
              </Txt>
            </View>
          ) : null}

          <Button
            title={getButtonTitle()}
            icon={getButtonIcon()}
            loading={importing}
            disabled={importing || (method === 'file' && !fileContent)}
            full
            variant="primary"
            onPress={() => void handleImport()}
          />

          <Txt variant="faint" style={styles.hint}>
            After importing, your profiles, accounts, and plugins will reload automatically.
          </Txt>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Txt variant="label">{label}</Txt>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 580,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  navigation: {
    height: 56,
    justifyContent: 'center',
  },
  backButton: {
    width: process.env.EXPO_OS === 'android' ? 48 : 44,
    height: process.env.EXPO_OS === 'android' ? 48 : 44,
    marginLeft: -spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  pressed: {
    backgroundColor: colors.surfaceHover,
  },
  header: {
    gap: spacing.xs,
  },
  otherMethods: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  tabsWrap: {
    width: '100%',
  },
  tabs: {
    flexDirection: 'row',
    gap: 3,
    padding: 3,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    minHeight: process.env.EXPO_OS === 'android' ? 48 : 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radii.sm,
  },
  tabSelected: {
    backgroundColor: colors.surfaceHover,
  },
  tabIcon: {
    marginRight: 2,
  },
  tabLabelSelected: {
    color: colors.text,
  },
  section: {
    gap: spacing.md,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  infoText: {
    flex: 1,
    color: colors.textMuted,
    lineHeight: 18,
  },
  form: {
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
  },
  field: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  input: {
    minHeight: process.env.EXPO_OS === 'android' ? 48 : 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    backgroundColor: colors.bgElevated,
    color: colors.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    fontSize: font.size.base,
  },
  passwordRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 0,
    height: '100%',
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primaryDim,
    backgroundColor: colors.bgElevated,
  },
  pickIconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.xs,
  },
  selectedFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  fileIconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
  },
  fileDetails: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  fileName: {
    fontSize: font.size.base,
  },
  changeFileButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
  },
  changeFileText: {
    color: colors.primary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
  },
  hint: {
    textAlign: 'center',
  },
});
