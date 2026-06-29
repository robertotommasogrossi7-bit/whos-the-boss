import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useTheme } from '@/theme/ThemeContext';

/* Shell globale: bottom tab a 4 voci (Home / Classifica / Storico / Leghe),
   stesso ordine della web (BottomNav). Le icone qui sono placeholder di
   sistema (Ionicons); le icone originali del progetto arrivano in R1.2. */
export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.textMuted,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="classifica"
        options={{
          title: 'Classifica',
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="storico"
        options={{
          title: 'Storico',
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="leghe"
        options={{
          title: 'Leghe',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
