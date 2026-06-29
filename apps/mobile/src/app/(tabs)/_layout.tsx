import { Tabs } from 'expo-router';

import { IconHistory, IconHome, IconTrophy, IconUsers } from '@/components/icons';
import { useTheme } from '@/theme/ThemeContext';

/* Shell globale: bottom tab a 4 voci (Home / Classifica / Storico / Leghe),
   stesso ordine e icone originali della web (DESIGN_SPEC §4). */
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
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <IconHome color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="classifica"
        options={{ title: 'Classifica', tabBarIcon: ({ color, size }) => <IconTrophy color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="storico"
        options={{ title: 'Storico', tabBarIcon: ({ color, size }) => <IconHistory color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="leghe"
        options={{ title: 'Leghe', tabBarIcon: ({ color, size }) => <IconUsers color={color} size={size} /> }}
      />
    </Tabs>
  );
}
