import React, { useState, useMemo, memo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useHydrationStore } from '../store/useHydrationStore';
import Header from '../components/Header';
import { scheduleOfflineAlarms } from '../services/notifications';
import Slider from '@react-native-community/slider';
// [REFACTOR: Impor getActivityMultiplier dari calculations.ts — dihapus dari file ini (DRY)]
import { calculateTarget, getActivityMultiplier } from '../utils/calculations';

/* =====================================================================
 * MODULAR UI COMPONENTS 
 * ===================================================================== */

const IntroCard = memo(() => (
  <View className="bg-gradient-to-b from-[#E0F2FE] to-[#F0F9FF] rounded-[24px] p-6 mb-6">
    <View className="flex-row items-start mb-2">
      <View className="w-14 h-14 bg-[#BAE6FD] rounded-full mr-4 items-center justify-center">
        <Ionicons name="person" size={24} color="#0369A1" />
      </View>
      <View className="flex-1">
        <Text className="text-2xl font-black text-[#0F172A] leading-tight mb-2" accessibilityRole="header">Calculate Your Target</Text>
        <Text className="text-slate-500 text-[11px] font-semibold leading-relaxed">Clinical formula tailored to your physiology and daily cadence. Zero telemetry, stored exclusively in on-device SQLite.</Text>
      </View>
    </View>
  </View>
));
IntroCard.displayName = 'IntroCard';

const BiologicalBaseline = memo(({ gender, setGender }: { gender: string, setGender: (g: 'Male' | 'Female') => void }) => (
  <View className="mb-6">
    <Text className="text-slate-500 font-bold text-[10px] tracking-widest uppercase mb-3">Biological Baseline</Text>
    <View className="flex-row bg-[#F0F9FF] rounded-full p-1 border border-[#E0F2FE]">
      <TouchableOpacity
        accessibilityRole="radio"
        accessibilityState={{ checked: gender === 'Male' }}
        accessibilityLabel="Select Male Gender"
        onPress={() => setGender('Male')}
        className={`flex-1 flex-row items-center justify-center py-3 rounded-full ${gender === 'Male' ? 'bg-[#0369A1]' : 'bg-transparent'}`}
      >
        <Ionicons name="male" size={16} color={gender === 'Male' ? 'white' : '#64748B'} style={{ marginRight: 6 }} />
        {/* [FIX: Sebelumnya className='#64748B' — bukan class Tailwind valid. Diperbaiki ke style prop] */}
        <Text style={{ color: gender === 'Male' ? 'white' : '#64748B' }} className="font-bold text-sm">Male</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="radio"
        accessibilityState={{ checked: gender === 'Female' }}
        accessibilityLabel="Select Female Gender"
        onPress={() => setGender('Female')}
        className={`flex-1 flex-row items-center justify-center py-3 rounded-full ${gender === 'Female' ? 'bg-[#0369A1]' : 'bg-transparent'}`}
      >
        <Ionicons name="female" size={16} color={gender === 'Female' ? 'white' : '#64748B'} style={{ marginRight: 6 }} />
        {/* [FIX: Sebelumnya className='#64748B' — bukan class Tailwind valid. Diperbaiki ke style prop] */}
        <Text style={{ color: gender === 'Female' ? 'white' : '#64748B' }} className="font-bold text-sm">Female</Text>
      </TouchableOpacity>
    </View>
  </View>
));
BiologicalBaseline.displayName = 'BiologicalBaseline';

const PhysicalMetrics = memo(({ age, setAge, height, setHeight }: { age: string, setAge: (v: string) => void, height: string, setHeight: (v: string) => void }) => (
  <View className="flex-row justify-between gap-4 mb-4">
    {/* Age */}
    <View className="flex-1 bg-[#F4F8FB] rounded-[24px] p-4 border border-[#E2E8F0]">
      <Text className="text-slate-600 font-bold text-xs mb-2">Age</Text>
      <View className="flex-row items-end mb-4 border-b border-[#E2E8F0] pb-1">
        <TextInput
          accessibilityLabel="Enter your age"
          className="text-3xl font-black text-[#0F172A] p-0 mr-1 outline-none"
          value={age}
          onChangeText={(val) => setAge(val.replace(/[^0-9]/g, ''))}
          keyboardType="numeric"
          maxLength={3}
          returnKeyType="done"
        />
        <Text className="text-xs text-slate-500 font-bold mb-1.5">yrs</Text>
      </View>
      <View className="flex-row justify-between gap-2">
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Decrease age" onPress={() => setAge(String(Math.max(1, (parseInt(age) || 0) - 1)))} className="flex-1 bg-[#E0F2FE] py-2.5 rounded-full items-center"><Text className="text-[#0369A1] font-bold text-lg leading-none">-</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Increase age" onPress={() => setAge(String(Math.min(120, (parseInt(age) || 0) + 1)))} className="flex-1 bg-[#E0F2FE] py-2.5 rounded-full items-center"><Text className="text-[#0369A1] font-bold text-lg leading-none">+</Text></TouchableOpacity>
      </View>
    </View>

    {/* Height */}
    <View className="flex-1 bg-[#F4F8FB] rounded-[24px] p-4 border border-[#E2E8F0] justify-between">
      <View>
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-slate-600 font-bold text-xs">Height</Text>
          <Ionicons name="swap-vertical" size={16} color="#94A3B8" />
        </View>
        <View className="flex-row items-end mb-4 border-b border-[#E2E8F0] pb-1">
          <TextInput
            accessibilityLabel="Enter your height in centimeters"
            className="text-3xl font-black text-[#0F172A] p-0 mr-1 outline-none"
            value={height}
            onChangeText={(val) => setHeight(val.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            maxLength={3}
            returnKeyType="done"
          />
          <Text className="text-xs text-slate-500 font-bold mb-1.5">cm</Text>
        </View>
      </View>
      <View className="flex-row justify-between gap-2">
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Decrease height" onPress={() => setHeight(String(Math.max(1, (parseInt(height) || 0) - 1)))} className="flex-1 bg-[#E0F2FE] py-2.5 rounded-full items-center"><Text className="text-[#0369A1] font-bold text-lg leading-none">-</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Increase height" onPress={() => setHeight(String(Math.min(300, (parseInt(height) || 0) + 1)))} className="flex-1 bg-[#E0F2FE] py-2.5 rounded-full items-center"><Text className="text-[#0369A1] font-bold text-lg leading-none">+</Text></TouchableOpacity>
      </View>
    </View>
  </View>
));
PhysicalMetrics.displayName = 'PhysicalMetrics';

const BodyWeightSlider = memo(({ weight, setWeight }: { weight: number, setWeight: (v: number) => void }) => (
  <View className="bg-[#F4F8FB] rounded-[24px] p-5 border border-[#E2E8F0]">
    <View className="flex-row justify-between items-center mb-4">
      <View className="flex-row items-center">
        <Ionicons name="scale-outline" size={16} color="#0369A1" style={{ marginRight: 6 }} />
        <Text className="text-slate-800 font-bold text-sm">Body Weight</Text>
      </View>
      <Text className="text-2xl font-black text-[#0369A1]">{weight}<Text className="text-sm">kg</Text></Text>
    </View>
    <Slider accessibilityLabel="Adjust body weight slider" style={{ width: '100%', height: 40 }} minimumValue={10} maximumValue={250} step={1} value={weight} onValueChange={setWeight} minimumTrackTintColor="#0EA5E9" maximumTrackTintColor="#E2E8F0" thumbTintColor="#0284c7" />
    <View className="flex-row justify-between mt-1 px-2">
      <Text className="text-[10px] text-slate-400 font-bold">10 kg</Text>
      <Text className="text-[10px] text-slate-400 font-bold">250 kg</Text>
    </View>
  </View>
));
BodyWeightSlider.displayName = 'BodyWeightSlider';

// [FIX: options array dipindah ke module scope — mencegah re-alokasi di setiap render]
const ACTIVITY_OPTIONS = [
  { label: 'Light', desc: 'Sedentary or desk-focused lifestyle', mult: 1.1, icon: 'car-sport-outline' },
  { label: 'Moderate', desc: 'Daily walking, gym 3-4 days/week', mult: 1.3, icon: 'walk-outline' },
  { label: 'Intense', desc: 'High athletic workload / labor', mult: 1.5, icon: 'barbell-outline' },
] as const;

const EnergyExpenditure = memo(({ activityLevel, setActivityLevel }: { activityLevel: string, setActivityLevel: (v: string) => void }) => (
  <View className="mb-6">
    <Text className="text-slate-500 font-bold text-[10px] tracking-widest uppercase mb-3">Daily Energy Expenditure</Text>
    {ACTIVITY_OPTIONS.map((act) => (
      <TouchableOpacity
        key={act.label}
        accessibilityRole="radio"
        accessibilityState={{ checked: activityLevel === act.label }}
        accessibilityLabel={`Select ${act.label} activity level`}
        onPress={() => setActivityLevel(act.label)}
        className={`flex-row items-center p-4 rounded-[20px] mb-3 ${activityLevel === act.label ? 'bg-[#0EA5E9]' : 'bg-[#F4F8FB] border border-[#E2E8F0]'}`}
      >
        <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${activityLevel === act.label ? 'bg-[#0284C7]' : 'bg-[#E2E8F0]'}`}>
          <Ionicons name={act.icon as any} size={20} color={activityLevel === act.label ? 'white' : '#64748B'} />
        </View>
        <View className="flex-1">
          {/* [FIX: Sebelumnya className='#0F172A' — bukan class Tailwind valid. Diperbaiki ke style prop] */}
          <Text style={{ color: activityLevel === act.label ? 'white' : '#0F172A' }} className="font-black text-sm mb-0.5">{act.label}</Text>
          <Text className={`font-semibold text-[11px] ${activityLevel === act.label ? 'text-[#E0F2FE]' : 'text-slate-500'}`}>{act.desc}</Text>
        </View>
        {/* [FIX: Sebelumnya className='#0F172A' — bukan class Tailwind valid. Diperbaiki ke style prop] */}
        <Text style={{ color: activityLevel === act.label ? 'white' : '#0F172A' }} className="font-black text-sm">{act.mult}x</Text>
      </TouchableOpacity>
    ))}
  </View>
));
EnergyExpenditure.displayName = 'EnergyExpenditure';

const SleepCadence = memo(({ wakeUp, setWakeUp, bedtime, setBedtime }: { wakeUp: string, setWakeUp: (v: string) => void, bedtime: string, setBedtime: (v: string) => void }) => (
  <View className="mb-8">
    <Text className="text-slate-500 font-bold text-[10px] tracking-widest uppercase mb-3">Sleep Cadence (Quiet Hours)</Text>
    <View className="flex-row justify-between gap-4 mb-3">
      <View className="flex-1 bg-[#F4F8FB] rounded-[24px] p-4 border border-[#E2E8F0]">
        <View className="flex-row items-center mb-3">
          <Ionicons name="sunny-outline" size={14} color="#059669" style={{ marginRight: 6 }} />
          <Text className="text-slate-600 font-bold text-xs">Wake Up</Text>
        </View>
        <View className="flex-row justify-between items-center mb-2">
          <TextInput accessibilityLabel="Enter wake up time in HH:MM format" className="text-2xl font-black text-[#0F172A] p-0 flex-1 outline-none" value={wakeUp} onChangeText={setWakeUp} placeholder="07:00" maxLength={5} returnKeyType="done" />
        </View>
        <Text className="text-[10px] text-slate-500 font-semibold">First notification</Text>
      </View>
      <View className="flex-1 bg-[#F4F8FB] rounded-[24px] p-4 border border-[#E2E8F0]">
        <View className="flex-row items-center mb-3">
          <Ionicons name="moon-outline" size={14} color="#0369A1" style={{ marginRight: 6 }} />
          <Text className="text-slate-600 font-bold text-xs">Bedtime</Text>
        </View>
        <View className="flex-row justify-between items-center mb-2">
          <TextInput accessibilityLabel="Enter bedtime in HH:MM format" className="text-2xl font-black text-[#0F172A] p-0 flex-1 outline-none" value={bedtime} onChangeText={setBedtime} placeholder="23:00" maxLength={5} returnKeyType="done" />
        </View>
        <Text className="text-[10px] text-slate-500 font-semibold">Mutes reminders</Text>
      </View>
    </View>
    <View className="bg-[#E0F2FE] rounded-2xl p-4 flex-row items-start">
      <Ionicons name="information-circle-outline" size={16} color="#0369A1" style={{ marginRight: 8, marginTop: 2 }} />
      <Text className="flex-1 text-[#0369A1] text-[11px] font-semibold leading-relaxed">Local device alarms are suspended dynamically during sleep hours to safeguard recovery.</Text>
    </View>
  </View>
));
SleepCadence.displayName = 'SleepCadence';

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
