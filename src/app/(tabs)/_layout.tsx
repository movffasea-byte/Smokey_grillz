import { Ionicons } from '@expo/vector-icons';
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
      <Tabs.Screen name="index" options={{ title: 'Menu', tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" size={size} color={color as string} /> }} />
      <Tabs.Screen name="cart" options={{ title: 'Cart', tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size} color={color as string} />, tabBarBadge: count > 0 ? count : undefined }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color as string} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color as string} /> }} />
    </Tabs>
  );
}
