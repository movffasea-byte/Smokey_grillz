import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Show pushes while the app is open too (native only; web uses the in-app alert).
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Asks for permission, gets this device's Expo push token and saves it on the user's profile.
// Does nothing on web, simulators, or builds without an EAS project id.
export async function registerForPush(userId: string): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Orders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
}

export async function clearPushToken(userId: string): Promise<void> {
  await supabase.from('profiles').update({ push_token: null }).eq('id', userId);
}
