import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { registerForPush } from '@/lib/pushNotifications';
import { useAuth } from '@/providers/auth';

// Registers the signed-in user's device for push and opens the right screen when one is tapped.
export function PushRegistration() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    registerForPush(userId).catch((e) => console.warn('Push registration failed:', e));
  }, [userId]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { orderId?: string; screen?: string };
      if (data.screen === 'staff') router.push('/staff');
      else if (data.orderId) router.push({ pathname: '/order/[id]', params: { id: data.orderId } });
    });
    return () => sub.remove();
  }, [router]);

  return null;
}
