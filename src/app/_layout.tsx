import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '@/providers/auth';
import { CartProvider } from '@/providers/cart';
import { colors } from '@/theme/colors';

function RootStack() {
  const { session, loading } = useAuth();
  if (loading) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="item/[id]" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="order/[id]" />
        <Stack.Screen name="payment-callback" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <CartProvider>
        <RootStack />
      </CartProvider>
    </AuthProvider>
  );
}
