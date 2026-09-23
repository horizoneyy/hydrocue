import { Platform } from 'react-native';
import type * as NotificationsType from 'expo-notifications';
import { useHydrationStore } from '../store/useHydrationStore';

// Singleton: load sekali, gagal diam-diam (untuk Expo Go compatibility)
let Notifications: typeof NotificationsType | null = null;

if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    if (Notifications) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    }
  } catch {
    // [PRUNING: Dihapus console.log - tidak perlu di production build]
  }
}

// Konfigurasi channel Android dengan priority/suara/getar sesuai preferensi user
async function setupNotificationChannel(highPriority: boolean, sound: boolean, vibrate: boolean) {
  if (Platform.OS !== 'android' || !Notifications) return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Hydration Reminders',
      importance: highPriority
        ? Notifications.AndroidImportance.MAX
        : Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: vibrate ? [0, 250, 250, 250] : undefined,
      lightColor: '#0284c7',
      sound: sound ? 'default' : undefined,
    });
  } catch {
    // [PRUNING: Silent fail - tidak block flow utama]
  }
}

export async function scheduleOfflineAlarms(targetMl: number, wakeTimeH: number, sleepTimeH: number) {
  // [EARLY RETURN: Keluar cepat jika platform tidak support]
  if (Platform.OS === 'web' || !Notifications) return;

  try {
    const { userProfile } = useHydrationStore.getState();
    const highPriority = userProfile.high_priority_enabled ?? true;
    const soundEnabled = userProfile.chime_enabled ?? true;
    const hapticsEnabled = userProfile.haptics_enabled ?? true;

    // Setup channel DULU sebelum cancel - agar alarm baru langsung pakai setting terbaru
    await setupNotificationChannel(highPriority, soundEnabled, hapticsEnabled);
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (targetMl <= 0) return;

    // [BUG FIX: Handle jadwal melewati tengah malam, misal: tidur jam 02:00]
    const wakeTotalMins = wakeTimeH * 60;
    let sleepTotalMins = sleepTimeH * 60;
    if (sleepTotalMins <= wakeTotalMins) sleepTotalMins += 24 * 60;

    const activeMins = sleepTotalMins - wakeTotalMins;
    const drinksNeeded = Math.max(1, Math.ceil(targetMl / 250));
    const isFixed = userProfile.notif_mode === 'Fixed';
    const intervalMins = isFixed
      ? (userProfile.manual_interval_min || 75)
      : activeMins / drinksNeeded;

    // [QA TEST MODE: Interval < 15 menit = mode pengujian, pakai TIME_INTERVAL agar langsung aktif]
    if (isFixed && intervalMins < 15) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💧 HydroCue Test Mode',
          body: `Alarm berulang setiap ${intervalMins} menit.`,
          sound: soundEnabled,
          vibrate: hapticsEnabled ? [0, 250, 250, 250] : undefined,
          autoDismiss: false,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(60, intervalMins * 60), // minimum 60 detik
          repeats: true,
        },
      });
      return;
    }

    // [EFISIENSI: Batasi maks 20 alarm untuk mencegah throttling OS]
    const maxAlarms = Math.min(drinksNeeded, 20);
    for (let i = 1; i <= maxAlarms; i++) {
      const triggerTotalMins = wakeTotalMins + i * intervalMins;
      if (triggerTotalMins >= sleepTotalMins) break;

      const hour = Math.floor(triggerTotalMins / 60) % 24;
      const minute = Math.round(triggerTotalMins % 60);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Waktunya Minum Air! 💧',
          body: 'Minum segelas air untuk mencapai target harianmu.',
          sound: soundEnabled,
          vibrate: hapticsEnabled ? [0, 250, 250, 250] : undefined,
          autoDismiss: false,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour,
          minute,
          repeats: true,
        },
      });
    }
  } catch {
    // [PRUNING: Silent fail - app tidak crash meski scheduling gagal]
  }
}

// Ekspor reference Notifications untuk dipakai settings.tsx (agar tidak double-require)
export { Notifications };
