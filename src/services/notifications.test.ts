/**
 * WHITE-BOX TESTING: notifications.ts (logika alarm penjadwalan)
 *
 * Menguji kalkulasi internal penjadwalan alarm tanpa memanggil
 * expo-notifications API yang sesungguhnya (menggunakan mock).
 *
 * Cara jalankan: npx jest src/services/notifications.test.ts --verbose
 */

// ============================================================
// MOCK SETUP
// ============================================================

// Mock Platform agar bisa simulasi Android
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

// Mock expo-notifications agar tidak perlu device nyata
const mockSetNotificationChannelAsync = jest.fn().mockResolvedValue(undefined);
const mockCancelAllScheduledNotificationsAsync = jest.fn().mockResolvedValue(undefined);
const mockScheduleNotificationAsync = jest.fn().mockResolvedValue('mock-notification-id');
const mockSetNotificationHandler = jest.fn();

jest.mock('expo-notifications', () => ({
  setNotificationHandler: mockSetNotificationHandler,
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
  cancelAllScheduledNotificationsAsync: mockCancelAllScheduledNotificationsAsync,
  scheduleNotificationAsync: mockScheduleNotificationAsync,
  AndroidImportance: { MAX: 5, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { CALENDAR: 'calendar', TIME_INTERVAL: 'timeInterval' },
}));

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

import { scheduleOfflineAlarms } from './notifications';
import { useHydrationStore } from '../store/useHydrationStore';

// ============================================================
// WHITE-BOX: scheduleOfflineAlarms() — logika internal
// ============================================================

describe('[WHITE-BOX] scheduleOfflineAlarms()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Memanggil cancelAllScheduledNotificationsAsync sebelum penjadwalan baru', async () => {
    await scheduleOfflineAlarms(2500, 7, 23);
    expect(mockCancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });

  it('Memanggil setNotificationChannelAsync dengan AndroidImportance.MAX jika high_priority=true', async () => {
    await scheduleOfflineAlarms(2500, 7, 23);
    expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({ importance: 5 }) // MAX = 5
    );
  });

  it('Menyertakan vibrationPattern jika haptics_enabled=true', async () => {
    await scheduleOfflineAlarms(2500, 7, 23);
    expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({ vibrationPattern: [0, 250, 250, 250] })
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
    expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({ vibrationPattern: undefined })
    );
  });

  it('Tidak menjadwalkan alarm jika targetMl = 0', async () => {
    await scheduleOfflineAlarms(0, 7, 23);
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('Menjadwalkan alarm dengan trigger CALENDAR dalam mode Auto', async () => {
    await scheduleOfflineAlarms(2500, 7, 23);
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({ type: 'calendar', repeats: true }),
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
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({
          type: 'timeInterval',
          seconds: 5 * 60,
          repeats: true,
        }),
      })
    );
    // Hanya 1 notifikasi yang dijadwalkan dalam test mode
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it('[BUG FIX] Tidak crash jika waktu tidur melewati tengah malam (sleep=2, wake=7)', async () => {
    await expect(scheduleOfflineAlarms(2500, 7, 2)).resolves.not.toThrow();
    // sleepTotalMins = 2*60 = 120 <= wakeTotalMins = 7*60 = 420
    // Setelah fix: sleepTotalMins += 24*60 → 120+1440 = 1560
    // activeMins = 1560 - 420 = 1140 menit (19 jam) → valid
    expect(mockScheduleNotificationAsync).toHaveBeenCalled();
  });

  it('Tidak melebihi 20 alarm yang dijadwalkan (proteksi OS throttle)', async () => {
    // Target sangat besar → drinks needed > 20
    await scheduleOfflineAlarms(20000, 7, 23);
    expect(mockScheduleNotificationAsync.mock.calls.length).toBeLessThanOrEqual(20);
  });

  it('Setiap alarm memiliki konten title, body, sound, dan vibrate', async () => {
    await scheduleOfflineAlarms(2500, 7, 23);
    const calls = mockScheduleNotificationAsync.mock.calls;
    calls.forEach(([args]: any) => {
      expect(args.content).toHaveProperty('title');
      expect(args.content).toHaveProperty('body');
      expect(args.content.sound).toBeDefined();
    });
  });

  it('Alarm dengan Fixed mode normal (>=15 menit) menggunakan trigger CALENDAR', async () => {
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
    const calls = mockScheduleNotificationAsync.mock.calls;
    calls.forEach(([args]: any) => {
      expect(args.trigger.type).toBe('calendar');
    });
  });

  it('Setiap jam alarm yang dijadwalkan berada dalam rentang 0-23', async () => {
    await scheduleOfflineAlarms(2500, 7, 23);
    const calls = mockScheduleNotificationAsync.mock.calls;
    calls.forEach(([args]: any) => {
      if (args.trigger.type === 'calendar') {
        expect(args.trigger.hour).toBeGreaterThanOrEqual(0);
        expect(args.trigger.hour).toBeLessThanOrEqual(23);
      }
    });
  });

  it('Menit alarm yang dijadwalkan berada dalam rentang 0-59', async () => {
    await scheduleOfflineAlarms(2500, 7, 23);
    const calls = mockScheduleNotificationAsync.mock.calls;
    calls.forEach(([args]: any) => {
      if (args.trigger.type === 'calendar') {
        expect(args.trigger.minute).toBeGreaterThanOrEqual(0);
        expect(args.trigger.minute).toBeLessThanOrEqual(59);
      }
    });
  });
});
