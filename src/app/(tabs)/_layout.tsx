import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Redirect, Tabs } from 'expo-router';

import { usePlayer } from '@/lib/player';
import { colors } from '@/lib/theme';

export default function TabLayout() {
  const { player, loading } = usePlayer();

  if (loading) return null;
  // Ainda não despertou: vai para o cadastro inicial.
  if (!player) return <Redirect href="/despertar" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: { backgroundColor: colors.panel, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.glow,
        tabBarInactiveTintColor: colors.muted,
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Status', tabBarIcon: ({ color }) => <FontAwesome size={24} name="user" color={color} /> }}
      />
      <Tabs.Screen
        name="missoes"
        options={{ title: 'Missões', tabBarIcon: ({ color }) => <FontAwesome size={24} name="list-ul" color={color} /> }}
      />
      <Tabs.Screen
        name="treinos"
        options={{ title: 'Treinos', tabBarIcon: ({ color }) => <FontAwesome size={24} name="heartbeat" color={color} /> }}
      />
      <Tabs.Screen
        name="jejum"
        options={{ title: 'Jejum', tabBarIcon: ({ color }) => <FontAwesome size={24} name="hourglass-half" color={color} /> }}
      />
    </Tabs>
  );
}
