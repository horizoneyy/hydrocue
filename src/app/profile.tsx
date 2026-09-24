import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useHydrationStore } from '../store/useHydrationStore';
import Header from '../components/Header';
import { scheduleOfflineAlarms } from '../services/notifications';
// [REFACTOR: Impor getActivityMultiplier dari calculations.ts — dihapus dari file ini (DRY)]
import { calculateTarget, getActivityMultiplier } from '../utils/calculations';

import { IntroCard, BiologicalBaseline, PhysicalMetrics, BodyWeightSlider, EnergyExpenditure, SleepCadence } from '../components/ProfileComponents';

/* =====================================================================
 * MAIN PROFILE SCREEN
 * ===================================================================== */

// [FIX: Regex untuk validasi format HH:MM]
const TIME_FORMAT_REGEX = /^\d{2}:\d{2}$/;

export default function Profile() {
  const router = useRouter();
  const { setTarget, userProfile, updateUserProfile } = useHydrationStore();

  const [gender, setGender] = useState<'Male' | 'Female'>(userProfile.gender || 'Male');
  const [weight, setWeight] = useState<number>(userProfile.weight || 60);
  const [age, setAge] = useState<string>(userProfile.age ? userProfile.age.toString() : '25');
  const [height, setHeight] = useState<string>(userProfile.height ? userProfile.height.toString() : '170');
  const [activityLevel, setActivityLevel] = useState(userProfile.activity_level || 'Moderate');
  const [wakeUp, setWakeUp] = useState(userProfile.wake_time || '07:00');
  const [bedtime, setBedtime] = useState(userProfile.sleep_time || '23:00');

  // [FIX: Bungkus useMemo — sebelumnya dihitung ulang setiap render, termasuk setiap keystroke]
  const currentTarget = useMemo(
    () => calculateTarget(weight, parseInt(age) || 25, getActivityMultiplier(activityLevel), gender),
    [weight, age, activityLevel, gender]
  );

  const handleSave = async () => {
    Keyboard.dismiss();

    // [FIX: Validasi format waktu yang benar — sebelumnya hanya cek .length === 5, "ab:cd" lolos]
    const isValidTime = (t: string) => TIME_FORMAT_REGEX.test(t);
    const finalWake = isValidTime(wakeUp.trim()) ? wakeUp.trim() : '07:00';
    const finalBed = isValidTime(bedtime.trim()) ? bedtime.trim() : '23:00';

    await updateUserProfile({
      gender,
      weight: Math.max(1, weight),
      age: Math.max(1, parseInt(age) || 25),
      height: Math.max(1, parseInt(height) || 170),
      activity_level: activityLevel,
      wake_time: finalWake,
      sleep_time: finalBed,
    });

    await setTarget(currentTarget);

    const wakeHour = parseInt(finalWake.split(':')[0], 10) || 7;
    const sleepHour = parseInt(finalBed.split(':')[0], 10) || 23;
    await scheduleOfflineAlarms(currentTarget, wakeHour, sleepHour);

    router.push('/');
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F0F2F5]">
      <Header />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView className="flex-1" contentContainerClassName="px-5 pt-4 pb-10" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <IntroCard />

          <BiologicalBaseline gender={gender} setGender={setGender} />

          <View className="mb-6">
            <Text className="text-slate-500 font-bold text-[10px] tracking-widest uppercase mb-3">Physical Metrics</Text>
            <PhysicalMetrics age={age} setAge={setAge} height={height} setHeight={setHeight} />
            <BodyWeightSlider weight={weight} setWeight={setWeight} />
          </View>

          <EnergyExpenditure activityLevel={activityLevel} setActivityLevel={setActivityLevel} />

          <SleepCadence wakeUp={wakeUp} setWakeUp={setWakeUp} bedtime={bedtime} setBedtime={setBedtime} />

          <View className="bg-[#E0F2FE] rounded-[24px] p-5 mb-8">
            <View className="flex-row items-center mb-2">
              <Ionicons name="flask-outline" size={16} color="#0369A1" style={{ marginRight: 6 }} />
              <Text className="text-[#0369A1] font-black text-sm">Dynamic Hydration Algorithm</Text>
            </View>
            <Text className="text-[#0284C7] text-[11px] font-semibold leading-relaxed">Calculated using adjusted Total Body Water (TBW) methodology: Baseline (Weight × 35 ml) calibrated by physiological age and energy consumption factor.</Text>
          </View>

          <View className="items-center mb-4">
            <View className="bg-[#BAE6FD] px-6 py-3 rounded-full flex-row items-center">
              <Ionicons name="water-outline" size={18} color="#0369A1" style={{ marginRight: 6 }} />
              <Text className="text-[#0369A1] font-bold text-sm mr-2">Daily Target:</Text>
              <Text className="text-[#0F172A] font-black text-xl">{currentTarget.toLocaleString()} ml</Text>
            </View>
          </View>

          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Save target and initialize app" onPress={handleSave} className="bg-[#0369A1] rounded-full py-4 flex-row items-center justify-center shadow-sm">
            <Text className="text-white font-black text-base mr-2">Save Target & Initialize HydroCue</Text>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
