import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { debugError, debugWarn } from "../utils/debug-log";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/** Keeps a render exception visible and logged instead of leaving a blank screen. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    debugError("UI", "Uncaught render error", error);
    if (__DEV__) debugWarn("UI", "React component stack", { componentStack: info.componentStack });
  }

  private retry = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-6 dark:bg-[#111b16]">
        <Text className="text-xl font-bold text-ink dark:text-[#eff4ee]">The app hit an error</Text>
        <Text className="mt-2 text-center leading-6 text-muted dark:text-[#b4c2b8]">
          Diagnostic details were written to the development console. Try loading this screen again.
        </Text>
        <Pressable accessibilityRole="button" className="mt-5 min-h-12 items-center justify-center rounded-xl bg-forest px-5" onPress={this.retry}>
          <Text className="font-semibold text-white">Try again</Text>
        </Pressable>
      </View>
    );
  }
}
