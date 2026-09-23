import React, { useState, memo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// [REFACTOR: Import getActivityMultiplier dari calculations.ts — DRY, hapus logika duplikat]
import { useHydrationStore, UserProfile } from '../store/useHydrationStore';
import Header from '../components/Header';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { calculateNextPing, getActivityMultiplier } from '../utils/calculations';
import { scheduleOfflineAlarms, requestNotificationPermissions, Notifications } from '../services/notifications';

/* =====================================================================
 * MODULAR UI COMPONENTS
 * ===================================================================== */

const ReminderEngineCard = memo(({
  nextPingLabel,
}: {
  nextPingLabel: string;
}) => (
  <LinearGradient
    colors={['#F0F9FF', '#F8FAFC']}
    start={{ x: 0.5, y: 0 }}
    end={{ x: 0.5, y: 1 }}
    className="rounded-[32px] p-5 mb-8 border border-[#E0F2FE]/50"
  >
    <View className="flex-row items-center mb-4">
      <View className="w-10 h-10 rounded-full bg-[#E0F2FE] items-center justify-center mr-4">
        <Ionicons name="alarm-outline" size={20} color="#0369A1" />
      </View>
      <Text className="text-[20px] font-black text-[#0F172A]" accessibilityRole="header">
        Reminder Engine
      </Text>
    </View>

    <Text className="text-slate-500 font-semibold text-[12px] leading-relaxed mb-6">
      HydroCue triggers battery-efficient wakeups. No accounts, background telemetry, or remote servers used.
    </Text>

    <View className="bg-white rounded-[20px] px-4 py-3.5 flex-row justify-between items-center shadow-sm">
      <View className="flex-row items-center">
        <Ionicons name="notifications-outline" size={18} color="#0369A1" style={{ marginRight: 8 }} />
        <Text className="text-slate-600 font-bold text-xs">Next ping expected:</Text>
      </View>
      <Text
        className="text-[#0369A1] font-black text-[13px]"
        accessibilityLabel={`Next notification expected at ${nextPingLabel}`}
      >
        {nextPingLabel}
      </Text>
    </View>
  </LinearGradient>
));
ReminderEngineCard.displayName = 'ReminderEngineCard';

const DispatchStrategyPanel = memo(({
  dispatchMode,
  fixedInterval,
  userProfile,
  target,
  onDispatchChange,
  onFixedIntervalChange,
}: {
  dispatchMode: string;
  fixedInterval: string | number;
  userProfile: UserProfile;
  target: number;
  onDispatchChange: (mode: 'Auto' | 'Fixed') => void;
  onFixedIntervalChange: (val: string | number) => void;
}) => (
  <View className="mb-8">
    <View className="flex-row justify-between items-center mb-4 px-2">
      <View className="flex-row items-center">
        <Ionicons name="options-outline" size={24} color="#0F172A" style={{ marginRight: 10 }} />
        <Text className="text-[22px] font-black text-[#0F172A]" accessibilityRole="header">
          Dispatch Strategy
        </Text>
      </View>
      <Text
        className="text-[#059669] font-black text-[10px] uppercase tracking-widest"
        accessibilityLabel={`Current strategy is ${dispatchMode}`}
      >
        {dispatchMode}
      </Text>
    </View>

    <View className="bg-white rounded-[32px] overflow-hidden border border-[#F1F5F9]">
      {/* Smart Adaptive Flow */}
      <TouchableOpacity
        accessibilityRole="radio"
        accessibilityState={{ checked: dispatchMode === 'Auto' }}
        accessibilityLabel="Select Smart Adaptive Flow dispatch strategy"
        onPress={() => onDispatchChange('Auto')}
        className={`p-5 border-b border-[#F1F5F9] ${dispatchMode === 'Auto' ? 'bg-[#F0F9FF]' : 'bg-white'}`}
      >
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-row items-center">
            <Ionicons
              name={dispatchMode === 'Auto' ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={dispatchMode === 'Auto' ? '#0284C7' : '#CBD5E1'}
              style={{ marginRight: 10 }}
            />
            <Text className="text-[#0F172A] font-black text-[15px]">Smart Adaptive Flow</Text>
          </View>
          <View className="bg-[#0284C7] px-3 py-1 rounded-full">
            <Text className="text-white font-bold text-[10px] tracking-wider">Recommended</Text>
          </View>
        </View>
        <Text className="text-slate-500 font-semibold text-[12px] leading-relaxed pl-[34px]">
          Evenly distributes hydration triggers across your active hours ({userProfile.wake_time} – {userProfile.sleep_time}) to hit your {target.toLocaleString()} ml target seamlessly.
        </Text>
      </TouchableOpacity>

      {/* Fixed Cadence */}
      <TouchableOpacity
        accessibilityRole="radio"
        accessibilityState={{ checked: dispatchMode === 'Fixed' }}
        accessibilityLabel="Select Fixed Cadence dispatch strategy"
        onPress={() => onDispatchChange('Fixed')}
        className={`p-5 ${dispatchMode === 'Fixed' ? 'bg-[#F0F9FF]' : 'bg-[#F8FAFC]'}`}
      >
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-row items-center">
            <Ionicons
              name={dispatchMode === 'Fixed' ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={dispatchMode === 'Fixed' ? '#0284C7' : '#CBD5E1'}
              style={{ marginRight: 10 }}
            />
            <Text className="text-[#0F172A] font-black text-[15px]">Fixed Cadence</Text>
          </View>
          <Text className="text-slate-500 font-semibold text-[11px]">Custom Interval</Text>
        </View>
        <Text className="text-slate-500 font-semibold text-[12px] leading-relaxed pl-[34px] mb-5">
          Repeats at rigid, immutable intervals throughout the day regardless of intake logs.
        </Text>

        <View className={`pl-[34px] ${dispatchMode === 'Auto' ? 'opacity-40' : 'opacity-100'}`}>
          <Text className="text-slate-400 font-semibold text-[10px] mb-3">Custom Repeat Interval:</Text>
          <View
            className={`w-full flex-row items-center border rounded-[16px] px-4 py-2 ${
              dispatchMode === 'Fixed' ? 'border-[#0369A1] bg-[#0369A1]' : 'border-[#E2E8F0] bg-white'
            }`}
          >
            <TextInput
              editable={dispatchMode === 'Fixed'}
              accessibilityLabel="Enter custom interval in minutes"
              className={`flex-1 font-black text-[18px] p-0 outline-none ${
                dispatchMode === 'Fixed' ? 'text-white' : 'text-slate-400'
              }`}
              keyboardType="numeric"
              value={fixedInterval.toString()}
              onChangeText={(val) => {
                if (val === '') {
                  onFixedIntervalChange('');
                } else {
                  const num = parseInt(val.replace(/[^0-9]/g, ''), 10);
                  if (!isNaN(num)) onFixedIntervalChange(num);
                }
              }}
              maxLength={4}
              returnKeyType="done"
            />
            <Text
              style={{ color: dispatchMode === 'Fixed' ? '#E0F2FE' : '#94A3B8' }}
              className="font-bold text-xs"
            >
              minutes
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  </View>
));
DispatchStrategyPanel.displayName = 'DispatchStrategyPanel';

const QuietHoursPanel = memo(({
  userProfile,
  chimeEnabled,
  hapticsEnabled,
  highPriorityEnabled,
  onToggleChime,
  onToggleHaptics,
  onTogglePriority,
}: {
  userProfile: UserProfile;
  chimeEnabled: boolean;
  hapticsEnabled: boolean;
  highPriorityEnabled: boolean;
  onToggleChime: (v: boolean) => void;
  onToggleHaptics: (v: boolean) => void;
  onTogglePriority: (v: boolean) => void;
}) => (
  <View className="mb-8">
    <View className="flex-row items-center mb-4 px-2">
      <Ionicons name="moon-outline" size={24} color="#0F172A" style={{ marginRight: 10 }} />
      {/* [FIX: Sebelumnya '&amp;' HTML entity di JSX — diperbaiki ke teks langsung] */}
      <Text className="text-[22px] font-black text-[#0F172A]" accessibilityRole="header">
        Quiet Hours & Haptics
      </Text>
    </View>

    <View className="bg-white rounded-[32px] p-5 border border-[#F1F5F9]">
      {/* Quiet Hours Status */}
      <View className="bg-[#F1F5F9] rounded-[24px] p-4 flex-row justify-between items-center mb-6">
        <View className="flex-row items-center">
          <Ionicons name="moon-outline" size={22} color="#475569" style={{ marginRight: 14 }} />
          <View>
            <Text className="text-[#0F172A] font-black text-[14px]">Strict Sleep Silence</Text>
            <Text
              className="text-slate-500 font-medium text-[11px] mt-0.5"
              accessibilityLabel={`Quiet hours from ${userProfile.sleep_time} to ${userProfile.wake_time}`}
            >
              {userProfile.sleep_time} – {userProfile.wake_time}
            </Text>
          </View>
        </View>
        <View className="bg-[#D1FAE5] px-3 py-1 rounded-full">
          <Text className="text-[#059669] font-black text-[10px] tracking-wider">Active</Text>
        </View>
      </View>

      {/* Chime Toggle */}
      <View className="flex-row justify-between items-center mb-6">
        <View className="flex-row items-center flex-1 pr-4">
          <Ionicons name="pulse-outline" size={22} color="#0369A1" style={{ marginRight: 14 }} />
          <View>
            <Text className="text-[#0F172A] font-black text-[14px]">Gentle Liquid Chime</Text>
            <Text className="text-slate-500 font-medium text-[11px] mt-0.5">Organic harmonic water droplet chime</Text>
          </View>
        </View>
        <Switch
          accessibilityRole="switch"
          accessibilityLabel="Toggle liquid chime sound"
          accessibilityState={{ checked: chimeEnabled }}
          value={chimeEnabled}
          onValueChange={onToggleChime}
          trackColor={{ true: '#0EA5E9', false: '#CBD5E1' }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* Haptics Toggle */}
      <View className="flex-row justify-between items-center mb-6">
        <View className="flex-row items-center flex-1 pr-4">
          <Ionicons name="phone-portrait-outline" size={22} color="#0369A1" style={{ marginRight: 14 }} />
          <View>
            <Text className="text-[#0F172A] font-black text-[14px]">Tactile Flow Haptics</Text>
            <Text className="text-slate-500 font-medium text-[11px] mt-0.5">Double micro-pulse on phone ring motor</Text>
          </View>
        </View>
        <Switch
          accessibilityRole="switch"
          accessibilityLabel="Toggle haptics vibration"
          accessibilityState={{ checked: hapticsEnabled }}
          value={hapticsEnabled}
          onValueChange={onToggleHaptics}
          trackColor={{ true: '#0EA5E9', false: '#CBD5E1' }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* High Priority Toggle */}
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center flex-1 pr-4">
          <Ionicons name="alert-outline" size={22} color="#0369A1" style={{ marginRight: 14 }} />
          <View>
            <Text className="text-[#0F172A] font-black text-[14px]">High Priority Alert</Text>
            <Text className="text-slate-500 font-medium text-[11px] mt-0.5">Bypass OS battery optimization sleep</Text>
          </View>
        </View>
        <Switch
          accessibilityRole="switch"
          accessibilityLabel="Toggle high priority alerts"
          accessibilityState={{ checked: highPriorityEnabled }}
          value={highPriorityEnabled}
          onValueChange={onTogglePriority}
          trackColor={{ true: '#0EA5E9', false: '#CBD5E1' }}
          thumbColor="#FFFFFF"
        />
      </View>
    </View>
  </View>
));
QuietHoursPanel.displayName = 'QuietHoursPanel';

const PhysiologicalTargetCard = memo(({
  userProfile,
  target,
  onRecalculate,
}: {
  userProfile: UserProfile;
  target: number;
  onRecalculate: () => void;
}) => {
  // [REFACTOR: Gunakan getActivityMultiplier dari calculations.ts — tidak ada duplikasi logika]
  const multiplier = getActivityMultiplier(userProfile.activity_level);
  return (
    <View className="mb-8">
      <View className="flex-row justify-between items-center mb-4 px-2">
        <View className="flex-row items-center">
          <Ionicons name="fitness-outline" size={24} color="#0F172A" style={{ marginRight: 10 }} />
          <Text className="text-[22px] font-black text-[#0F172A]" accessibilityRole="header">
            Physiological Target
          </Text>
        </View>
      </View>
      <View className="bg-white rounded-[32px] p-5 border border-[#F1F5F9]">
        <View className="flex-row justify-between gap-2 mb-5">
          <View className="bg-[#F8FAFC] flex-1 rounded-[16px] py-4 px-1 items-center justify-center">
            <Text className="text-slate-500 font-black text-[9px] uppercase tracking-wider mb-1 text-center" numberOfLines={1}>Profile</Text>
            <Text className="text-[#0F172A] font-black text-[12px] text-center" numberOfLines={1}>{userProfile.gender} • {userProfile.age}y</Text>
          </View>
          <View className="bg-[#F8FAFC] flex-1 rounded-[16px] py-4 px-1 items-center justify-center">
            <Text className="text-slate-500 font-black text-[9px] uppercase tracking-wider mb-1 text-center" numberOfLines={1}>Metrics</Text>
            <Text className="text-[#0F172A] font-black text-[12px] text-center" numberOfLines={1}>{userProfile.weight}kg • {multiplier}x</Text>
          </View>
          <View className="bg-[#E0F2FE] flex-1 rounded-[16px] py-4 px-1 items-center justify-center">
            <Text className="text-[#0284C7] font-black text-[9px] uppercase tracking-wider mb-1 text-center" numberOfLines={1}>Target</Text>
            <Text className="text-[#0284C7] font-black text-[12px] text-center" numberOfLines={1}>{target.toLocaleString()} ml</Text>
          </View>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Navigate to profile page to recalculate goal and intervals"
          onPress={onRecalculate}
          className="bg-[#E0F2FE] rounded-[20px] py-4 flex-row items-center justify-center"
        >
          <Ionicons name="calculator-outline" size={18} color="#0369A1" style={{ marginRight: 8 }} />
          {/* [FIX: Sebelumnya '&amp;' HTML entity — diperbaiki ke teks langsung] */}
          <Text className="text-[#0369A1] font-black text-[14px]">Recalculate Goal & Intervals</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});
PhysiologicalTargetCard.displayName = 'PhysiologicalTargetCard';

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

  const nextPing = calculateNextPing(
    userProfile.wake_time,
    userProfile.sleep_time,
    target,
    currentVolume,
    dispatchMode === 'Fixed' ? (Number(fixedInterval) || 1) : undefined
  );
  const nextPingLabel = nextPing
    ? `${nextPing} (${dispatchMode === 'Fixed' ? `${fixedInterval}m interval` : 'Auto'})`
    : 'Goal Reached! 🎉';

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
      Alert.alert('Izin Diberikan', 'HydroCue sekarang dapat mengirim pengingat minum air!');
    } else {
      Alert.alert(
        'Izin Ditolak',
        'Aktifkan notifikasi di Pengaturan > Aplikasi > HydroCue > Notifikasi.'
      );
    }
  }, [scheduleAlarms]);

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
          // [FIX: Guard ulang di dalam callback — non-null assertion (!) dihapus, guard eksplisit]
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

  // [FIX: Chime & Haptics toggle TIDAK lagi memanggil scheduleAlarms() — ini hanya preferensi suara/getar,
  //  bukan perubahan jadwal alarm. Reschedule hanya dibutuhkan saat mode/interval berubah.
  //  Sebelumnya: 3 toggle berturut-turut = 3x reschedule + 3x DB write dalam milidetik]
  // Reschedule diperlukan agar channel Android langsung diperbarui dengan sound/vibration baru
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

  // High priority MEMBUTUHKAN reschedule karena mengubah AndroidImportance di notification channel
  const handleTogglePriority = useCallback(async (val: boolean) => {
    setHighPriorityEnabled(val);
    await updateUserProfile({ high_priority_enabled: val });
    await scheduleAlarms(); // Wajib reschedule karena channel priority berubah
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
            accessibilityRole="button"
            accessibilityLabel="Enable notification alerts"
            onPress={handleRequestPermissions}
            className="w-full bg-[#0369A1] rounded-[20px] py-4 items-center flex-row justify-center shadow-sm"
          >
            <Ionicons name="notifications" size={18} color="white" style={{ marginRight: 8 }} />
            <Text className="text-white font-black text-[15px]">Enable Alerts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cancel all scheduled notifications"
            onPress={handleCancelNotifications}
            className="w-full bg-[#F1F5F9] rounded-[20px] py-4 items-center flex-row justify-center border border-[#E2E8F0]"
          >
            <Ionicons name="close-circle-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
            <Text className="text-slate-600 font-bold text-[14px]">Cancel All</Text>
          </TouchableOpacity>
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
