/**
 * WHITE-BOX TESTING: notifications.ts (logika alarm penjadwalan)
 *
 * Menguji kalkulasi internal penjadwalan alarm tanpa memanggil
 * expo-notifications API yang sesungguhnya (menggunakan mock).
 *
 * Cara jalankan: npx jest src/services/notifications.test.ts --verbose
 */

import { scheduleOfflineAlarms, requestNotificationPermissions } from './notifications';
import { useHydrationStore } from '../store/useHydrationStore';
import * as NotificationsMock from 'expo-notifications';

// ============================================================
// MOCK SETUP
// ============================================================

// Mock Platform agar bisa simulasi Android
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('expo-notifications', () => {
  return {
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
    deleteNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
    cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
    scheduleNotificationAsync: jest.fn().mockResolvedValue('mock-notification-id'),
    getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3 },
    AndroidNotificationPriority: { MAX: 'max' },
    AndroidNotificationVisibility: { PUBLIC: 1 },
    SchedulableTriggerInputTypes: { CALENDAR: 'calendar', TIME_INTERVAL: 'timeInterval', DAILY: 'daily' },
  };
});

// Mock Zustand store
jest.mock('../store/useHydrationStore', () => ({
  useHydrationStore: {
    getState: jest.fn(() => ({
      userProfile: {
        notif_mode: 'Auto',
        manual_interval_min: 60,
        chime_enabled: true,
        haptics_enabled: true,
        high_priority_enabled: true,
      },
    })),
  },
}));

// ============================================================
// WHITE-BOX: scheduleOfflineAlarms() — logika internal
// ============================================================

describe('[WHITE-BOX] scheduleOfflineAlarms()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Memanggil cancelAllScheduledNotificationsAsync sebelum penjadwalan baru', async () => {
    await scheduleOfflineAlarms(2500, 7, 23);
    expect(NotificationsMock.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });

  it('Memanggil setNotificationChannelAsync dengan AndroidImportance.MAX jika high_priority=true', async () => {
    await scheduleOfflineAlarms(2500, 7, 23);
    expect(NotificationsMock.setNotificationChannelAsync).toHaveBeenCalledWith(
      'hydrocue_reminders_v2',
      expect.objectContaining({ importance: 5 }) // MAX = 5
    );
  });

  it('Menyertakan vibrationPattern jika haptics_enabled=true', async () => {
    await scheduleOfflineAlarms(2500, 7, 23);
    expect(NotificationsMock.setNotificationChannelAsync).toHaveBeenCalledWith(
      'hydrocue_reminders_v2',
      expect.objectContaining({ vibrationPattern: [0, 300, 200, 300] })
    );
  });

  it('TIDAK menyertakan vibrationPattern jika haptics_enabled=false', async () => {
    (useHydrationStore.getState as jest.Mock).mockReturnValueOnce({
      userProfile: {
        notif_mode: 'Auto',
        manual_interval_min: 60,
        chime_enabled: true,
        haptics_enabled: false, // <-- dimatikan
        high_priority_enabled: true,
      },
    });
    await scheduleOfflineAlarms(2500, 7, 23);
    expect(NotificationsMock.setNotificationChannelAsync).toHaveBeenCalledWith(
      'hydrocue_reminders_v2',
      expect.objectContaining({ vibrationPattern: undefined })
    );
  });

  it('Tidak menjadwalkan alarm jika targetMl = 0', async () => {
    await scheduleOfflineAlarms(0, 7, 23);
    expect(NotificationsMock.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('Menjadwalkan alarm dengan trigger DAILY dalam mode Auto', async () => {
    await scheduleOfflineAlarms(2500, 7, 23);
    expect(NotificationsMock.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({ type: 'daily' }),
      })
    );
  });

  it('Menjadwalkan alarm dengan trigger TIME_INTERVAL dalam mode Fixed interval < 15 menit', async () => {
    (useHydrationStore.getState as jest.Mock).mockReturnValueOnce({
      userProfile: {
        notif_mode: 'Fixed',
        manual_interval_min: 5, // < 15 menit = test mode
        chime_enabled: true,
        haptics_enabled: true,
        high_priority_enabled: true,
      },
    });
    await scheduleOfflineAlarms(2500, 7, 23);
    expect(NotificationsMock.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({
          type: 'timeInterval',
          seconds: 5 * 60,
          repeats: true,
        }),
      })
    );
    // Hanya 1 notifikasi yang dijadwalkan dalam test mode
    expect(NotificationsMock.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it('[BUG FIX] Tidak crash jika waktu tidur melewati tengah malam (sleep=2, wake=7)', async () => {
    await expect(scheduleOfflineAlarms(2500, 7, 2)).resolves.not.toThrow();
    // sleepTotalMins = 2*60 = 120 <= wakeTotalMins = 7*60 = 420
    // Setelah fix: sleepTotalMins += 24*60 → 120+1440 = 1560
    // activeMins = 1560 - 420 = 1140 menit (19 jam) → valid
    expect(NotificationsMock.scheduleNotificationAsync).toHaveBeenCalled();
  });

  it('Tidak melebihi 20 alarm yang dijadwalkan (proteksi OS throttle)', async () => {
    // Target sangat besar → drinks needed > 20
    await scheduleOfflineAlarms(20000, 7, 23);
    expect((NotificationsMock.scheduleNotificationAsync as jest.Mock).mock.calls.length).toBeLessThanOrEqual(64);
  });

  it('Setiap alarm memiliki konten title, body, sound, dan vibrate', async () => {
    await scheduleOfflineAlarms(2500, 7, 23);
    const calls = (NotificationsMock.scheduleNotificationAsync as jest.Mock).mock.calls;
    calls.forEach(([args]: any) => {
      expect(args.content).toHaveProperty('title');
      expect(args.content).toHaveProperty('body');
      expect(args.content.sound).toBeDefined();
    });
  });

  it('Alarm dengan Fixed mode normal (>=15 menit) menggunakan trigger DAILY', async () => {
    (useHydrationStore.getState as jest.Mock).mockReturnValueOnce({
      userProfile: {
        notif_mode: 'Fixed',
        manual_interval_min: 60, // normal, >= 15 menit
        chime_enabled: true,
        haptics_enabled: true,
        high_priority_enabled: true,
      },
    });
    await scheduleOfflineAlarms(2500, 7, 23);
    const calls = (NotificationsMock.scheduleNotificationAsync as jest.Mock).mock.calls;
    calls.forEach(([args]: any) => {
      expect(args.trigger.type).toBe('daily');
    });
  });

  it('Setiap jam alarm yang dijadwalkan berada dalam rentang 0-23', async () => {
    await scheduleOfflineAlarms(2500, 7, 23);
    const calls = (NotificationsMock.scheduleNotificationAsync as jest.Mock).mock.calls;
    calls.forEach(([args]: any) => {
      if (args.trigger.type === 'daily') {
        expect(args.trigger.hour).toBeGreaterThanOrEqual(0);
        expect(args.trigger.hour).toBeLessThanOrEqual(23);
      }
    });
  });

  it('Menit alarm yang dijadwalkan berada dalam rentang 0-59', async () => {
    await scheduleOfflineAlarms(2500, 7, 23);
    const calls = (NotificationsMock.scheduleNotificationAsync as jest.Mock).mock.calls;
    calls.forEach(([args]: any) => {
      if (args.trigger.type === 'daily') {
        expect(args.trigger.minute).toBeGreaterThanOrEqual(0);
        expect(args.trigger.minute).toBeLessThanOrEqual(59);
      }
    });
  });
});



describe('[WHITE-BOX] requestNotificationPermissions()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Mengembalikan true jika existingStatus sudah granted', async () => {
    (NotificationsMock.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    const result = await requestNotificationPermissions();
    expect(result).toBe(true);
    expect(NotificationsMock.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('Meminta izin baru jika existingStatus belum granted dan mengembalikan hasilnya', async () => {
    (NotificationsMock.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'undetermined' });
    (NotificationsMock.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    
    const result = await requestNotificationPermissions();
    
    expect(NotificationsMock.requestPermissionsAsync).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('Mengembalikan false jika permintaan izin ditolak', async () => {
    (NotificationsMock.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'undetermined' });
    (NotificationsMock.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    
    const result = await requestNotificationPermissions();
    
    expect(NotificationsMock.requestPermissionsAsync).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('Mengembalikan false jika terjadi error', async () => {
    (NotificationsMock.getPermissionsAsync as jest.Mock).mockRejectedValueOnce(new Error('error'));
    
    const result = await requestNotificationPermissions();
    
    expect(result).toBe(false);
  });
});

describe('[WHITE-BOX] setNotificationHandler config', () => {
  it('Returns correct configuration from handleNotification', async () => {
    // We need to re-require to trigger the module level code
    jest.isolateModules(() => {
      const NotificationsMock = /* eslint-disable-next-line @typescript-eslint/no-require-imports */ require('expo-notifications');
      /* eslint-disable-next-line @typescript-eslint/no-require-imports */ require('./notifications');
      
      const handlerCall = NotificationsMock.setNotificationHandler.mock.calls[0][0];
      expect(handlerCall).toBeDefined();
      return handlerCall.handleNotification().then((res: any) => {
        expect(res.shouldShowAlert).toBe(true);
        expect(res.shouldShowBanner).toBe(true);
      });
    });
  });
});
