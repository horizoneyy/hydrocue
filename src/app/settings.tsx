import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// [REFACTOR: Import getActivityMultiplier dari calculations.ts — DRY, hapus logika duplikat]
import { useHydrationStore } from '../store/useHydrationStore';
import Header from '../components/Header';
import { useRouter } from 'expo-router';
import { calculateNextPing } from '../utils/calculations';
import { scheduleOfflineAlarms, requestNotificationPermissions, Notifications, setupNotificationChannel } from '../services/notifications';

import { ReminderEngineCard, DispatchStrategyPanel, QuietHoursPanel, PhysiologicalTargetCard } from '../components/SettingsComponents';

/* =====================================================================
 * MAIN SETTINGS SCREEN
 * ===================================================================== */

export default function Settings() {
  const { target, userProfile, currentVolume, updateUserProfile } = useHydrationStore();
  const router = useRouter();

  const [dispatchMode, setDispatchMode] = useState<'Auto' | 'Fixed'>(
    userProfile.notif_mode === 'Fixed' ? 'Fixed' : 'Auto'
  );
  const [fixedInterval, setFixedInterval] = useState<string | number>(userProfile.manual_interval_min || 75);
  const [chimeEnabled, setChimeEnabled] = useState(userProfile.chime_enabled);
  const [hapticsEnabled, setHapticsEnabled] = useState(userProfile.haptics_enabled);
  const [highPriorityEnabled, setHighPriorityEnabled] = useState(userProfile.high_priority_enabled);
  const [isEnabling, setIsEnabling] = useState(false);

  const nextPing = calculateNextPing(
    userProfile.wake_time,
    userProfile.sleep_time,
    target,
    currentVolume,
    dispatchMode === 'Fixed' ? (Number(fixedInterval) || 1) : undefined
  );
  const nextPingLabel = nextPing
    ? `${nextPing} (${dispatchMode === 'Fixed' ? `${fixedInterval}m interval` : 'Auto'})`
    : 'Goal Reached!';

  const scheduleAlarms = useCallback(async () => {
    const { userProfile: latestProfile } = useHydrationStore.getState();
    const wakeHour = parseInt(latestProfile.wake_time.split(':')[0], 10) || 7;
    const sleepHour = parseInt(latestProfile.sleep_time.split(':')[0], 10) || 23;
    await scheduleOfflineAlarms(target, wakeHour, sleepHour);
  }, [target]);

  const handleDispatchChange = useCallback(async (mode: 'Auto' | 'Fixed') => {
    setDispatchMode(mode);
    await updateUserProfile({ notif_mode: mode });
    await scheduleAlarms();
  }, [updateUserProfile, scheduleAlarms]);

  const handleFixedIntervalChange = useCallback(async (interval: string | number) => {
    setFixedInterval(interval);
    const num = Number(interval);
    if (!isNaN(num) && num > 0) {
      await updateUserProfile({ manual_interval_min: num });
      await scheduleAlarms();
    }
  }, [updateUserProfile, scheduleAlarms]);

  const handleRequestPermissions = useCallback(async () => {
    if (isEnabling) return;
    setIsEnabling(true);
    try {
      if (Platform.OS === 'web') {
        return Alert.alert('Not supported', 'Notifications are not supported on web.');
      }
      if (!Notifications) {
        return Alert.alert(
          'Not Supported',
          'Notifications are not available in Expo Go (SDK 53+). Please install the APK build.'
        );
      }
      // Gunakan helper baru yang handle Android 13+ (POST_NOTIFICATIONS) & iOS critical alerts
      const granted = await requestNotificationPermissions();
      if (granted) {
        await scheduleAlarms();
        Vibration.vibrate([0, 100, 100, 100]);
        Alert.alert('Izin Diberikan', 'HydroCue sekarang dapat mengirim pengingat minum air!');
      } else {
        Alert.alert(
          'Izin Ditolak',
          'Aktifkan notifikasi di Pengaturan > Aplikasi > HydroCue > Notifikasi.'
        );
      }
    } finally {
      setIsEnabling(false);
    }
  }, [scheduleAlarms, isEnabling]);

  const handleCancelNotifications = useCallback(async () => {
    if (Platform.OS === 'web' || !Notifications) {
      return Alert.alert('Tidak Didukung', 'Notifikasi tidak tersedia di platform ini.');
    }
    Alert.alert('Batalkan Semua Reminder?', 'Semua jadwal pengingat minum air akan dihapus.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Ya, Hapus',
        style: 'destructive',
        onPress: async () => {
          if (!Notifications) return;
          try {
            await Notifications.cancelAllScheduledNotificationsAsync();
            Alert.alert('Berhasil', 'Semua jadwal hydration reminder telah dibatalkan.');
          } catch {
            Alert.alert('Gagal', 'Tidak dapat membatalkan notifikasi. Pastikan izin sudah diberikan.');
          }
        },
      },
    ]);
  }, []);

  const handleTestNotification = useCallback(async () => {
    if (Platform.OS === 'web' || !Notifications) {
      return Alert.alert('Tidak Didukung', 'Notifikasi tidak tersedia di platform ini.');
    }
    try {
      // Pastikan channel sesuai dengan preferensi yang sedang aktif
      const { userProfile } = useHydrationStore.getState();
      await setupNotificationChannel(
        userProfile.high_priority_enabled ?? true,
        userProfile.chime_enabled ?? true,
        userProfile.haptics_enabled ?? true
      );

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'HydroCue Test 💧',
          body: 'Ini adalah notifikasi uji coba! Waktunya minum air.',
          sound: userProfile.chime_enabled ? 'waterdrop.wav' : undefined,
          ...(Platform.OS === 'android' && { channelId: 'hydrocue_reminders_v2' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1, // Akan muncul dalam 1 detik
          repeats: false,
        },
      });
      // Beri tahu user bahwa notifikasi akan muncul
      Alert.alert('Notifikasi Dikirim', 'Notifikasi akan muncul dalam 1-2 detik. Silakan kunci layar Anda atau tunggu sejenak jika ingin mengujinya.');
    } catch {
      Alert.alert('Gagal', 'Tidak dapat mengirim notifikasi uji coba. Pastikan izin notifikasi sudah aktif.');
    }
  }, []);

  // [FIX: Karena update sound/vibrate/importance di Android mewajibkan penghapusan channel lama,
  // maka semua notifikasi yang sudah terjadwal di channel tersebut harus dibatalkan dan dijadwal ulang.
  // Oleh karena itu, kita kembali menggunakan scheduleAlarms() setiap kali toggle berubah]
  const handleToggleChime = useCallback(async (val: boolean) => {
    setChimeEnabled(val);
    await updateUserProfile({ chime_enabled: val });
    await scheduleAlarms();
  }, [updateUserProfile, scheduleAlarms]);

  const handleToggleHaptics = useCallback(async (val: boolean) => {
    setHapticsEnabled(val);
    await updateUserProfile({ haptics_enabled: val });
    await scheduleAlarms();
  }, [updateUserProfile, scheduleAlarms]);

  const handleTogglePriority = useCallback(async (val: boolean) => {
    setHighPriorityEnabled(val);
    await updateUserProfile({ high_priority_enabled: val });
    await scheduleAlarms();
  }, [updateUserProfile, scheduleAlarms]);

  const handleRecalculate = useCallback(() => {
    router.push('/profile');
  }, [router]);

  return (
    <SafeAreaView className="flex-1 bg-[#F0F2F5]">
      <Header />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-4 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <ReminderEngineCard
          nextPingLabel={nextPingLabel}
        />
        <DispatchStrategyPanel
          dispatchMode={dispatchMode}
          fixedInterval={fixedInterval}
          userProfile={userProfile}
          target={target}
          onDispatchChange={handleDispatchChange}
          onFixedIntervalChange={handleFixedIntervalChange}
        />

        {/* Notification Actions */}
        <View className="gap-3 mb-8">
          <TouchableOpacity
            disabled={isEnabling}
            accessibilityRole="button"
            accessibilityLabel="Enable notification alerts"
            onPress={handleRequestPermissions}
            className={`w-full ${isEnabling ? 'bg-[#94A3B8]' : 'bg-[#0369A1]'} rounded-[20px] py-4 items-center flex-row justify-center shadow-sm`}
          >
            <Ionicons name="notifications" size={18} color="white" style={{ marginRight: 8 }} />
            <Text className="text-white font-black text-[15px]">{isEnabling ? 'Enabling...' : 'Enable Alerts'}</Text>
          </TouchableOpacity>
          <View className="flex-row gap-3">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Test notification"
              onPress={handleTestNotification}
              className="flex-1 bg-[#E0F2FE] rounded-[20px] py-4 items-center flex-row justify-center border border-[#BAE6FD]"
            >
              <Ionicons name="flask-outline" size={18} color="#0369A1" style={{ marginRight: 8 }} />
              <Text className="text-[#0369A1] font-bold text-[14px]">Test Reminder</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cancel all scheduled notifications"
              onPress={handleCancelNotifications}
              className="flex-1 bg-[#F1F5F9] rounded-[20px] py-4 items-center flex-row justify-center border border-[#E2E8F0]"
            >
              <Ionicons name="close-circle-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
              <Text className="text-slate-600 font-bold text-[14px]">Cancel All</Text>
            </TouchableOpacity>
          </View>
        </View>

        <QuietHoursPanel
          userProfile={userProfile}
          chimeEnabled={chimeEnabled}
          hapticsEnabled={hapticsEnabled}
          highPriorityEnabled={highPriorityEnabled}
          onToggleChime={handleToggleChime}
          onToggleHaptics={handleToggleHaptics}
          onTogglePriority={handleTogglePriority}
        />
        <PhysiologicalTargetCard
          userProfile={userProfile}
          target={target}
          onRecalculate={handleRecalculate}
        />
        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
