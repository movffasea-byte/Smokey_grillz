import { Platform } from 'react-native';

// Browser-only helpers for the staff new-order alert. Everything is a no-op off the web.
const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

let audio: AudioContext | null = null;

// Browsers only let audio start after a user gesture, so unlock it on the first tap/click.
export function unlockAlertSound() {
  if (!isWeb) return () => {};
  const unlock = () => {
    try {
      audio ??= new AudioContext();
      void audio.resume();
    } catch {}
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  return () => window.removeEventListener('pointerdown', unlock);
}

export function playAlertSound() {
  if (!isWeb || !audio || audio.state !== 'running') return;
  const ctx = audio;
  [880, 1175, 880].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + i * 0.22;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.2);
  });
}

export const desktopAlertsSupported = isWeb && typeof Notification !== 'undefined';

export function desktopAlertPermission(): NotificationPermission | 'unsupported' {
  return desktopAlertsSupported ? Notification.permission : 'unsupported';
}

export async function requestDesktopAlerts() {
  if (!desktopAlertsSupported) return 'unsupported' as const;
  return Notification.requestPermission();
}

export function showDesktopAlert(title: string, body: string) {
  if (!desktopAlertsSupported || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body });
  } catch {}
}

// Flashes the tab title until the tab is focused again. Returns a stop function.
export function flashTabTitle(message: string) {
  if (!isWeb) return () => {};
  const original = document.title;
  let on = false;
  const timer = setInterval(() => {
    on = !on;
    document.title = on ? message : original;
  }, 1000);
  const stop = () => {
    clearInterval(timer);
    document.title = original;
    window.removeEventListener('focus', stop);
  };
  window.addEventListener('focus', stop);
  return stop;
}
