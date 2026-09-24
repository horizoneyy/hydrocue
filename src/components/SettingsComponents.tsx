import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Switch, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../store/useHydrationStore';
import { LinearGradient } from 'expo-linear-gradient';
import { getActivityMultiplier } from '../utils/calculations';

export const ReminderEngineCard = memo(({ nextPingLabel }: { nextPingLabel: string }) => (
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
      <Text className="text-[#0369A1] font-black text-[13px]" accessibilityLabel={`Next notification expected at ${nextPingLabel}`}>
        {nextPingLabel}
      </Text>
    </View>
  </LinearGradient>
));
ReminderEngineCard.displayName = 'ReminderEngineCard';

export const DispatchStrategyPanel = memo(({ dispatchMode, fixedInterval, userProfile, target, onDispatchChange, onFixedIntervalChange }: { dispatchMode: string, fixedInterval: string | number, userProfile: UserProfile, target: number, onDispatchChange: (mode: 'Auto' | 'Fixed') => void, onFixedIntervalChange: (val: string | number) => void }) => (
  <View className="mb-8">
    <View className="flex-row justify-between items-center mb-4 px-2">
      <View className="flex-row items-center">
        <Ionicons name="options-outline" size={24} color="#0F172A" style={{ marginRight: 10 }} />
        <Text className="text-[22px] font-black text-[#0F172A]" accessibilityRole="header">Dispatch Strategy</Text>
      </View>
      <Text className="text-[#059669] font-black text-[10px] uppercase tracking-widest" accessibilityLabel={`Current strategy is ${dispatchMode}`}>
        {dispatchMode}
      </Text>
    </View>
    <View className="bg-white rounded-[32px] overflow-hidden border border-[#F1F5F9]">
      <TouchableOpacity
        accessibilityRole="radio"
        accessibilityState={{ checked: dispatchMode === 'Auto' }}
        accessibilityLabel="Select Smart Adaptive Flow dispatch strategy"
        onPress={() => onDispatchChange('Auto')}
        className={`p-5 border-b border-[#F1F5F9] ${dispatchMode === 'Auto' ? 'bg-[#F0F9FF]' : 'bg-white'}`}
      >
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-row items-center">
            <Ionicons name={dispatchMode === 'Auto' ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={dispatchMode === 'Auto' ? '#0284C7' : '#CBD5E1'} style={{ marginRight: 10 }} />
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
      <TouchableOpacity
        accessibilityRole="radio"
        accessibilityState={{ checked: dispatchMode === 'Fixed' }}
        accessibilityLabel="Select Fixed Cadence dispatch strategy"
        onPress={() => onDispatchChange('Fixed')}
        className={`p-5 ${dispatchMode === 'Fixed' ? 'bg-[#F0F9FF]' : 'bg-[#F8FAFC]'}`}
      >
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-row items-center">
            <Ionicons name={dispatchMode === 'Fixed' ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={dispatchMode === 'Fixed' ? '#0284C7' : '#CBD5E1'} style={{ marginRight: 10 }} />
            <Text className="text-[#0F172A] font-black text-[15px]">Fixed Cadence</Text>
          </View>
          <Text className="text-slate-500 font-semibold text-[11px]">Custom Interval</Text>
        </View>
        <Text className="text-slate-500 font-semibold text-[12px] leading-relaxed pl-[34px] mb-5">
          Repeats at rigid, immutable intervals throughout the day regardless of intake logs.
        </Text>
        <View className={`pl-[34px] ${dispatchMode === 'Auto' ? 'opacity-40' : 'opacity-100'}`}>
          <Text className="text-slate-400 font-semibold text-[10px] mb-3">Custom Repeat Interval:</Text>
          <View className={`w-full flex-row items-center border rounded-[16px] px-4 py-2 ${dispatchMode === 'Fixed' ? 'border-[#0369A1] bg-[#0369A1]' : 'border-[#E2E8F0] bg-white'}`}>
            <TextInput
              editable={dispatchMode === 'Fixed'}
              accessibilityLabel="Enter custom interval in minutes"
              className={`flex-1 font-black text-[18px] p-0 outline-none ${dispatchMode === 'Fixed' ? 'text-white' : 'text-slate-400'}`}
              keyboardType="numeric"
              value={fixedInterval.toString()}
              onChangeText={(val) => {
                if (val === '') { onFixedIntervalChange(''); } else {
                  const num = parseInt(val.replace(/[^0-9]/g, ''), 10);
                  if (!isNaN(num)) onFixedIntervalChange(num);
                }
              }}
              maxLength={4}
              returnKeyType="done"
            />
            <Text style={{ color: dispatchMode === 'Fixed' ? '#E0F2FE' : '#94A3B8' }} className="font-bold text-xs">minutes</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  </View>
));
DispatchStrategyPanel.displayName = 'DispatchStrategyPanel';

export const QuietHoursPanel = memo(({ userProfile, chimeEnabled, hapticsEnabled, highPriorityEnabled, onToggleChime, onToggleHaptics, onTogglePriority }: { userProfile: UserProfile, chimeEnabled: boolean, hapticsEnabled: boolean, highPriorityEnabled: boolean, onToggleChime: (v: boolean) => void, onToggleHaptics: (v: boolean) => void, onTogglePriority: (v: boolean) => void }) => (
  <View className="mb-8">
    <View className="flex-row items-center mb-4 px-2">
      <Ionicons name="moon-outline" size={24} color="#0F172A" style={{ marginRight: 10 }} />
      <Text className="text-[22px] font-black text-[#0F172A]" accessibilityRole="header">Quiet Hours & Haptics</Text>
    </View>
    <View className="bg-white rounded-[32px] p-5 border border-[#F1F5F9]">
      <View className="bg-[#F1F5F9] rounded-[24px] p-4 flex-row justify-between items-center mb-6">
        <View className="flex-row items-center">
          <Ionicons name="moon-outline" size={22} color="#475569" style={{ marginRight: 14 }} />
          <View>
            <Text className="text-[#0F172A] font-black text-[14px]">Strict Sleep Silence</Text>
            <Text className="text-slate-500 font-medium text-[11px] mt-0.5" accessibilityLabel={`Quiet hours from ${userProfile.sleep_time} to ${userProfile.wake_time}`}>
              {userProfile.sleep_time} – {userProfile.wake_time}
            </Text>
          </View>
        </View>
        <View className="bg-[#D1FAE5] px-3 py-1 rounded-full">
          <Text className="text-[#059669] font-black text-[10px] tracking-wider">Active</Text>
        </View>
      </View>
      <View className="flex-row justify-between items-center mb-6">
        <View className="flex-row items-center flex-1 pr-4">
          <Ionicons name="pulse-outline" size={22} color="#0369A1" style={{ marginRight: 14 }} />
          <View>
            <Text className="text-[#0F172A] font-black text-[14px]">Gentle Liquid Chime</Text>
            <Text className="text-slate-500 font-medium text-[11px] mt-0.5">Organic harmonic water droplet chime</Text>
          </View>
        </View>
        <Switch accessibilityRole="switch" accessibilityLabel="Toggle liquid chime sound" accessibilityState={{ checked: chimeEnabled }} value={chimeEnabled} onValueChange={onToggleChime} trackColor={{ true: '#0EA5E9', false: '#CBD5E1' }} thumbColor="#FFFFFF" />
      </View>
      <View className="flex-row justify-between items-center mb-6">
        <View className="flex-row items-center flex-1 pr-4">
          <Ionicons name="phone-portrait-outline" size={22} color="#0369A1" style={{ marginRight: 14 }} />
          <View>
            <Text className="text-[#0F172A] font-black text-[14px]">Tactile Flow Haptics</Text>
            <Text className="text-slate-500 font-medium text-[11px] mt-0.5">Double micro-pulse on phone ring motor</Text>
          </View>
        </View>
        <Switch accessibilityRole="switch" accessibilityLabel="Toggle haptics vibration" accessibilityState={{ checked: hapticsEnabled }} value={hapticsEnabled} onValueChange={onToggleHaptics} trackColor={{ true: '#0EA5E9', false: '#CBD5E1' }} thumbColor="#FFFFFF" />
      </View>
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center flex-1 pr-4">
          <Ionicons name="alert-outline" size={22} color="#0369A1" style={{ marginRight: 14 }} />
          <View>
            <Text className="text-[#0F172A] font-black text-[14px]">High Priority Alert</Text>
            <Text className="text-slate-500 font-medium text-[11px] mt-0.5">Bypass OS battery optimization sleep</Text>
          </View>
        </View>
        <Switch accessibilityRole="switch" accessibilityLabel="Toggle high priority alerts" accessibilityState={{ checked: highPriorityEnabled }} value={highPriorityEnabled} onValueChange={onTogglePriority} trackColor={{ true: '#0EA5E9', false: '#CBD5E1' }} thumbColor="#FFFFFF" />
      </View>
    </View>
  </View>
));
QuietHoursPanel.displayName = 'QuietHoursPanel';

export const PhysiologicalTargetCard = memo(({ userProfile, target, onRecalculate }: { userProfile: UserProfile, target: number, onRecalculate: () => void }) => {
  const multiplier = getActivityMultiplier(userProfile.activity_level);
  return (
    <View className="mb-8">
      <View className="flex-row justify-between items-center mb-4 px-2">
        <View className="flex-row items-center">
          <Ionicons name="fitness-outline" size={24} color="#0F172A" style={{ marginRight: 10 }} />
          <Text className="text-[22px] font-black text-[#0F172A]" accessibilityRole="header">Physiological Target</Text>
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
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Navigate to profile page to recalculate goal and intervals" onPress={onRecalculate} className="bg-[#E0F2FE] rounded-[20px] py-4 flex-row items-center justify-center">
          <Ionicons name="calculator-outline" size={18} color="#0369A1" style={{ marginRight: 8 }} />
          <Text className="text-[#0369A1] font-black text-[14px]">Recalculate Goal & Intervals</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});
PhysiologicalTargetCard.displayName = 'PhysiologicalTargetCard';
