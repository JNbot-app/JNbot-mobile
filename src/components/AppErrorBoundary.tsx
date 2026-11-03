import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme/theme";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

/**
 * Keeps a JavaScript render error visible instead of making it look like the
 * native app simply disappeared. The full component stack is still printed
 * to the device console for diagnosis.
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[AppErrorBoundary] render error", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>The app hit a display error</Text>
        <Text style={styles.message}>{this.state.error.message}</Text>
        <Text style={styles.hint}>
          Please copy the device console lines beginning with [AppErrorBoundary].
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "700", textAlign: "center" },
  message: { color: colors.danger, marginTop: spacing.md, textAlign: "center" },
  hint: { color: colors.textMuted, marginTop: spacing.lg, textAlign: "center" },
});
