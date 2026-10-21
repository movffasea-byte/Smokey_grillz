import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { PushRegistration } from '@/components/PushRegistration';
import { StaffOrderAlert } from '@/components/StaffOrderAlert';
import { AuthProvider, useAuth } from '@/providers/auth';
import { CartProvider } from '@/providers/cart';
import { colors } from '@/theme/colors';

function RootStack() {
  const { session, loading, isStaff, isAdmin } = useAuth();
  if (loading) return null;

  return (
    <>
      <PushRegistration />
      {isStaff ? <StaffOrderAlert /> : null}
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
        <Stack.Protected guard={isStaff}>
          <Stack.Screen name="staff" />
          <Stack.Screen name="admin/menu" />
          <Stack.Screen name="admin/item" />
          <Stack.Screen name="admin/categories" />
        </Stack.Protected>
        <Stack.Protected guard={isAdmin}>
          <Stack.Screen name="admin/settings" />
          <Stack.Screen name="admin/roles" />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </>
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
