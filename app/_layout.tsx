/**
 * THESIS: JNbot is a calm pocket operations console, not a card dashboard.
 * OWN-WORLD: near-black grouped surfaces, warm coral actions, semantic status colors, native typography and hairline rules.
 * STORY: understand what is live, find what needs attention, then act without hunting through chrome.
 * FIRST VIEWPORT: large Overview title, profile context, operational summary, quick actions, active bots and automations.
 * FORM: approved category-standard native utility comp; direction seed e11b9f5f. Green is status-only.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
 */
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { ConnectionProvider } from '../src/net/ConnectionProvider';
import { loadSavedTheme, useTheme } from '../src/theme/theme';
import { AppFeedbackProvider } from '../src/components/AppFeedback';
import { AutomationDrawerProvider } from '../src/components/automation/AutomationDrawer';
import { MonetizationProvider } from '../src/monetization/MonetizationProvider';
import { BackgroundPowerProvider, BackgroundSync } from '../src/background';
import { WidgetSync } from '../src/widgets/WidgetSync';
import { SystemNotifications } from '../src/notifications/SystemNotifications';
import * as Sentry from '@sentry/react-native';

const diagnostics = process.env.EXPO_PUBLIC_SENTRY_DIAGNOSTICS === 'true';

Sentry.init({
  dsn: 'https://e312129933b58c0e11d69890461adb88@o530070.ingest.us.sentry.io/4511891866386432',
  enabled: !__DEV__ || diagnostics,
  sendDefaultPii: true,
  enableLogs: diagnostics,
  tracesSampleRate: diagnostics ? 1 : 0,
  replaysSessionSampleRate: diagnostics ? 1 : 0,
  replaysOnErrorSampleRate: 0,
});

export default Sentry.wrap(function RootLayout() {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    void loadSavedTheme();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <MonetizationProvider>
          <ConnectionProvider>
            <BackgroundPowerProvider>
              <BackgroundSync />
              <WidgetSync />
              <SystemNotifications />
              <AppFeedbackProvider>
                <AutomationDrawerProvider>
                  <StatusBar style={isDark ? "light" : "dark"} />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: colors.bg },
                      gestureEnabled: false,
                    }}
                  >
                    <Stack.Screen name="index" options={{ gestureEnabled: false }} />
                    <Stack.Screen name="connect" options={{ gestureEnabled: false }} />
                    <Stack.Screen name="scan" options={{ gestureEnabled: true }} />
                    <Stack.Screen name="(app)" options={{ gestureEnabled: false }} />
                  </Stack>
                </AutomationDrawerProvider>
              </AppFeedbackProvider>
            </BackgroundPowerProvider>
          </ConnectionProvider>
      </MonetizationProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
  );
});
