import { Tabs } from 'expo-router';

import { glassBar } from '@/components/ui/Glass';
import { useCart } from '@/providers/cart';
import { colors } from '@/theme/colors';

export default function TabsLayout() {
  const { count } = useCart();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { ...glassBar, position: 'absolute', borderTopColor: colors.border },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Menu' }} />
      <Tabs.Screen name="cart" options={{ title: 'Cart', tabBarBadge: count > 0 ? count : undefined }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
