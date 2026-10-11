import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { PlayerProvider } from '@/lib/player';
import { colors } from '@/lib/theme';

export default function RootLayout() {
  return (
    <PlayerProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </PlayerProvider>
  );
}
