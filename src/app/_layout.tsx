import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '@/core/theme';
import { useScan } from '@/bdix/scanner';
import { registerBuiltinSources } from '@/features/registerSources';

export default function RootLayout() {
  useEffect(() => {
    registerBuiltinSources();          // wire all section sources
    useScan.getState().start();        // silent BDIX scan on Wi-Fi (no UI block)
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}
      />
    </GestureHandlerRootView>
  );
}
