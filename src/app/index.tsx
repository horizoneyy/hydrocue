import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useHydrationStore } from '../store/useHydrationStore';
import Header from '../components/Header';
import { HeroCard, QuickLogPanel, CadenceStats, IntakeList } from '../components/DashboardComponents';

/* =====================================================================
 * MAIN DASHBOARD
 * ===================================================================== */

export default function Dashboard() {
  const { currentVolume, target, logs, loadData, addIntake, deleteIntake, userProfile, isLoading } = useHydrationStore();

  const [dateStr] = useState(() => {
    const today = new Date();
    return `Today, ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  });

  const [isCustomModalVisible, setCustomModalVisible] = useState(false);
  const [customAmountStr, setCustomAmountStr] = useState('');
  const [customAmountError, setCustomAmountError] = useState('');

  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  useEffect(() => {
    loadData().then(() => setHasInitiallyLoaded(true));
  }, [loadData]);

  // [FIX: Dihapus double-guard isAdding lokal — isLoading dari store adalah single source of truth]
  // Sebelumnya: local isAdding + store isLoading = race condition potential
  const handleQuickAdd = useCallback(async (amount: number, name: string) => {
    if (isLoading) return;
    await addIntake(amount, name);
  }, [isLoading, addIntake]);

  const handleCustomSubmit = useCallback(() => {
    const amount = parseInt(customAmountStr, 10);
    if (!customAmountStr || isNaN(amount) || amount <= 0) {
      return setCustomAmountError('Masukkan jumlah antara 1 – 5000 ml');
    }
    // [FIX: Validasi > 5000 sekarang dapat tercapai karena maxLength=4 (maks input 9999)]
    if (amount > 5000) return setCustomAmountError('Maksimum 5000 ml per entri');

    Keyboard.dismiss();
    setCustomAmountError('');
    handleQuickAdd(amount, 'Custom');
    setCustomModalVisible(false);
    setCustomAmountStr('');
  }, [customAmountStr, handleQuickAdd]);

  const handleCloseModal = useCallback(() => {
    Keyboard.dismiss();
    setCustomModalVisible(false);
    setCustomAmountStr('');
    setCustomAmountError('');
  }, []);

  const handleCustomOpen = useCallback(() => {
    setCustomModalVisible(true);
  }, []);

  // Early Returns & State Checks
  if (!hasInitiallyLoaded && isLoading && logs.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-[#F0F2F5] items-center justify-center">
        <Header />
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-500 font-bold mt-4" accessibilityRole="alert">Loading your hydration data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Pre-calculated stats
  const progress = target > 0 ? currentVolume / target : 0;
  const progressPercent = Math.round(progress * 100);
  const leftVolume = Math.max(0, target - currentVolume);
  const wakeHour = parseInt(userProfile.wake_time.split(':')[0], 10) || 7;
  const sleepHour = parseInt(userProfile.sleep_time.split(':')[0], 10) || 23;
  const activeHours = Math.max(1, sleepHour - wakeHour);
  const drinksNeeded = Math.ceil(target / 250);
  const intervalMins = Math.round((activeHours * 60) / drinksNeeded);
  const ratePerHour = target > 0 ? Math.round(target / activeHours) : 0;

  return (
    <SafeAreaView className="flex-1 bg-[#F0F2F5]">
      <Header />
      <ScrollView className="flex-1" contentContainerClassName="px-5 pt-2 pb-10" showsVerticalScrollIndicator={false}>
        <View className="flex-row justify-between items-end mb-6">
          <View>
            <Text className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-1">Daily Tracking</Text>
            <Text className="text-[26px] font-black text-[#0F172A]" accessibilityRole="header">{dateStr}</Text>
          </View>
        </View>

        <HeroCard progressPercent={progressPercent} progress={progress} target={target} currentVolume={currentVolume} leftVolume={leftVolume} />
        
        {/* [FIX: isLoading dari store sebagai single source of truth, bukan local isAdding] */}
        <QuickLogPanel isAdding={isLoading} onQuickAdd={handleQuickAdd} onCustomOpen={handleCustomOpen} />
        
        <CadenceStats logsCount={logs.length} currentVolume={currentVolume} target={target} intervalMins={intervalMins} ratePerHour={ratePerHour} />
        
        <IntakeList logs={logs} onDelete={deleteIntake} />
        
        <View className="h-10" />
      </ScrollView>

      {/* Custom Amount Modal */}
      <Modal visible={isCustomModalVisible} transparent={true} animationType="fade" onRequestClose={handleCloseModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View className="flex-1 justify-center items-center bg-slate-900/50 px-5">
              <Pressable className="absolute top-0 bottom-0 left-0 right-0" onPress={handleCloseModal} />
              <View className="bg-white rounded-[32px] p-6 w-full shadow-xl">
                <View className="flex-row justify-between items-center mb-6">
                  <Text className="text-xl font-black text-[#0F172A]">Custom Amount</Text>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close custom amount modal" onPress={handleCloseModal} className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
                    <Ionicons name="close" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <View className={`rounded-[24px] p-5 mb-2 flex-row items-center justify-between ${customAmountError ? 'bg-red-50 border border-red-300' : 'bg-[#F4F8FB] border border-[#E2E8F0]'}`}>
                  <TextInput
                    accessibilityLabel="Enter custom amount of water in milliliters"
                    className="text-4xl font-black flex-1 p-0 outline-none"
                    style={{ color: customAmountError ? '#DC2626' : '#0369A1' }}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={customAmountStr}
                    onChangeText={(val) => { setCustomAmountStr(val.replace(/[^0-9]/g, '')); setCustomAmountError(''); }}
                    autoFocus
                    maxLength={4}
                    returnKeyType="done"
                    onSubmitEditing={handleCustomSubmit}
                  />
                  <Text className="text-lg font-bold text-slate-400 ml-2">ml</Text>
                </View>
                {customAmountError ? (
                  <View className="flex-row items-center mb-4 px-1" accessibilityRole="alert">
                    <Ionicons name="alert-circle-outline" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                    <Text className="text-red-500 font-semibold text-xs">{customAmountError}</Text>
                  </View>
                ) : (
                  <Text className="text-slate-400 font-semibold text-[10px] mb-4 px-1">Rentang valid: 1 – 5000 ml</Text>
                )}
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Confirm add water" onPress={handleCustomSubmit} className="bg-[#0369A1] rounded-full py-4 items-center justify-center shadow-sm w-full">
                  <Text className="text-white font-black text-[15px]">Add Water</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
