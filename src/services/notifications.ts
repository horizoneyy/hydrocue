import { Platform } from 'react-native';
import type * as NotificationsType from 'expo-notifications';
import { useHydrationStore } from '../store/useHydrationStore';

// ─── Singleton: load sekali, gagal diam-diam (Expo Go compatibility) ─────────
let Notifications: typeof NotificationsType | null = null;

if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require('expo-notifications');
    if (Notifications) {
      // PERBAIKAN: shouldShowBanner + shouldPlaySound + priority MAX agar
      // notifikasi muncul di lockscreen & saat layar mati
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          priority: Notifications!.AndroidNotificationPriority?.MAX ?? 'max',
        }),
      });
    }
  } catch {
    // silent fail untuk Expo Go
  }
}

// ─── Setup Android Notification Channel ──────────────────────────────────────
// Channel harus HIGH atau MAX agar notifikasi muncul di lockscreen
export async function setupNotificationChannel(
  highPriority: boolean,
  sound: boolean,
  vibrate: boolean,
) {
  if (Platform.OS !== 'android' || !Notifications) return;
  try {
    // [FIX: Android mengharuskan channel dihapus dulu agar update sound/vibrate/importance diterapkan]
    await Notifications.deleteNotificationChannelAsync('hydrocue_reminders_v2');
    await Notifications.setNotificationChannelAsync('hydrocue_reminders_v2', {
      name: 'Hydration Reminders',
      description: 'Pengingat minum air dari HydroCue',
      importance: highPriority
        ? Notifications.AndroidImportance.MAX   // muncul di lockscreen & heads-up
        : Notifications.AndroidImportance.HIGH, // HIGH tetap muncul di lockscreen
      enableVibrate: vibrate,
      vibrationPattern: vibrate ? [0, 300, 200, 300] : undefined, // Pola getar tetesan air
      enableLights: true,
      lightColor: '#0284c7',
      sound: sound ? 'waterdrop.wav' : undefined,
      showBadge: true,
      // bypassDnd → hanya aktif jika high priority dipilih user
      bypassDnd: highPriority,
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility?.PUBLIC ?? 1, // tampil penuh di lockscreen
    });
  } catch {
    // silent fail
  }
}

// ─── Request Permissions (Android 13+ wajib minta izin POST_NOTIFICATIONS) ───
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web' || !Notifications) return false;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowCriticalAlerts: true, // iOS: izin critical alert agar bypass DND
      },
    });
    return status === 'granted';
  } catch {
    return false;
  }
}

// ─── Jadwalkan Alarm Harian ───────────────────────────────────────────────────
export async function scheduleOfflineAlarms(
  targetMl: number,
  wakeTimeH: number,
  sleepTimeH: number,
) {
  if (Platform.OS === 'web' || !Notifications) return;

  try {
    const { userProfile } = useHydrationStore.getState();
    const highPriority = userProfile.high_priority_enabled ?? true;
    const soundEnabled  = userProfile.chime_enabled ?? true;
    const hapticsEnabled = userProfile.haptics_enabled ?? true;

    // Selalu setup channel SEBELUM cancel agar alarm baru pakai setting terbaru
    await setupNotificationChannel(highPriority, soundEnabled, hapticsEnabled);
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (targetMl <= 0) return;

    // Handle jadwal melewati tengah malam
    const wakeMins  = wakeTimeH * 60;
    let sleepMins   = sleepTimeH * 60;
    if (sleepMins <= wakeMins) sleepMins += 24 * 60;

    const activeMins   = sleepMins - wakeMins;
    const drinksNeeded = Math.max(1, Math.ceil(targetMl / 250));
    const isFixed      = userProfile.notif_mode === 'Fixed';
    const intervalMins = isFixed
      ? (userProfile.manual_interval_min || 75)
      : activeMins / drinksNeeded;

    // KONTEN NOTIFIKASI — channelId harus cocok dengan channel yang dibuat di atas
    const makeContent = (index: number): NotificationsType.NotificationContentInput => ({
      title: 'hydrocue',
      body: `Waktunya minum ${Math.round(targetMl / drinksNeeded)} ml air!`,
      sound: soundEnabled ? 'waterdrop.wav' : undefined,
      // PENTING: channelId harus sama persis dengan yang didaftarkan
      ...(Platform.OS === 'android' && { channelId: 'hydrocue_reminders_v2' }),
      // Sticky agar tidak hilang sendiri
      sticky: false,
      autoDismiss: false,
      badge: index,
      // Android: priority MAX agar heads-up notification & lockscreen
      ...(Platform.OS === 'android' && {
        priority: Notifications!.AndroidNotificationPriority?.MAX ?? 'max',
      }),
    });

    // MODE TEST: interval < 15 menit → pakai TIME_INTERVAL agar langsung aktif
    if (isFixed && intervalMins < 15) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'hydrocue',
          body: `Waktunya minum ${Math.round(targetMl / drinksNeeded)} ml air!`,
          sound: soundEnabled ? 'waterdrop.wav' : undefined,
          ...(Platform.OS === 'android' && { channelId: 'hydrocue_reminders_v2' }),
          autoDismiss: false,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(60, intervalMins * 60),
          repeats: true,
        },
      });
      return;
    }

    // JADWALKAN hingga 64 alarm (batas iOS) — gunakan DAILY trigger agar repeat setiap hari
    const maxAlarms = Math.min(drinksNeeded, 64);
    const scheduledPromises: Promise<string>[] = [];

    for (let i = 1; i <= maxAlarms; i++) {
      const triggerMins = wakeMins + i * intervalMins;
      if (triggerMins >= sleepMins) break;

      const hour   = Math.floor(triggerMins / 60) % 24;
      const minute = Math.round(triggerMins % 60);

      scheduledPromises.push(
        Notifications.scheduleNotificationAsync({
          content: makeContent(i),
          trigger: {
            // PERBAIKAN: Gunakan DAILY untuk repeat setiap hari yang konsisten
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
          },
        }),
      );
    }

    // Jalankan semua scheduling secara paralel → lebih cepat
    await Promise.allSettled(scheduledPromises);

  } catch {
    // silent fail — app tidak crash meski scheduling gagal
  }
}

// Ekspor reference Notifications untuk dipakai settings.tsx
export { Notifications };
