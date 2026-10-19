import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { formatNaira } from '@/lib/menu';
import { subscribeToNewOrders, type Order } from '@/lib/orders';
import { flashTabTitle, playAlertSound, showDesktopAlert, unlockAlertSound } from '@/lib/staffAlerts';
import { colors } from '@/theme/colors';

// Mounted for staff/admin only: announces each new order wherever they are in the app.
export function StaffOrderAlert() {
  const router = useRouter();
  const [latest, setLatest] = useState<Order | null>(null);
  const stopFlash = useRef<(() => void) | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => unlockAlertSound(), []);

  useEffect(() => {
    const unsubscribe = subscribeToNewOrders((order) => {
      setLatest(order);
      playAlertSound();
      const ref = order.id.slice(0, 8).toUpperCase();
      showDesktopAlert('New order', `#${ref} · ${formatNaira(order.total_kobo)}`);
      stopFlash.current?.();
      stopFlash.current = flashTabTitle('🔔 New order!');
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setLatest(null), 15000);
    });
    return () => {
      unsubscribe();
      stopFlash.current?.();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!latest) return null;
  return (
    <Pressable
      style={styles.banner}
      onPress={() => {
        setLatest(null);
        router.push('/staff');
      }}>
      <Text style={styles.title}>🔔 New order #{latest.id.slice(0, 8).toUpperCase()}</Text>
      <Text style={styles.sub}>
        {formatNaira(latest.total_kobo)} · {latest.type === 'pickup' ? 'Pickup' : 'Delivery'} · tap to view
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 100,
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 14,
    gap: 2,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '800' },
  sub: { color: colors.text, fontSize: 14 },
});
