import React, { useEffect, useCallback, useState, memo } from 'react';
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useHydrationStore, IntakeLog } from '../store/useHydrationStore';
import Header from '../components/Header';
import { LinearGradient } from 'expo-linear-gradient';
import CircularProgress from '../components/CircularProgress';

/* =====================================================================
 * MODULAR UI COMPONENTS 
 * ===================================================================== */

const HeroCard = memo(({ progressPercent, progress, target, currentVolume, leftVolume }: { progressPercent: number, progress: number, target: number, currentVolume: number, leftVolume: number }) => (
  <LinearGradient
    colors={['#F0F9FF', '#E0F2FE']}
    start={{ x: 0.5, y: 0 }}
    end={{ x: 0.5, y: 1 }}
    className="rounded-[40px] overflow-hidden mb-8 shadow-sm border border-[#E0F2FE] relative px-5 py-6"
  >
    <View className="flex-row justify-between items-center z-10">
      <View className="bg-[#BAE6FD] px-4 py-2 rounded-full flex-row items-center">
        <Ionicons name="flame-outline" size={14} color="#0369A1" style={{ marginRight: 6 }} />
        <Text className="text-[#0369A1] font-bold text-xs" accessibilityLabel={`Goal status: ${progressPercent >= 100 ? 'Goal Met' : progressPercent >= 50 ? 'On Track' : 'Keep Going'}`}>
          {progressPercent >= 100 ? 'Goal Met! 🎉' : progressPercent >= 50 ? 'On Track' : 'Keep Going'}
        </Text>
      </View>
      <View className="bg-[#0369A1] px-4 py-2 rounded-full shadow-sm">
        <Text className="text-white font-black text-xs" accessibilityLabel={`${progressPercent} percent completed`}>{progressPercent}%</Text>
      </View>
    </View>
    <CircularProgress progress={progress} target={target} current={currentVolume} />
    <View className="flex-row justify-center items-center mb-2">
      <Ionicons name="flag-outline" size={14} color="#0369A1" style={{ marginRight: 6 }} />
      <Text className="text-slate-600 font-semibold text-xs" accessibilityLabel={`${leftVolume} milliliters left to conquer today's goal`}>
        <Text className="font-black text-[#0369A1]">{leftVolume.toLocaleString()} ml left</Text> to conquer today&apos;s goal
      </Text>
    </View>
  </LinearGradient>
));
HeroCard.displayName = 'HeroCard';

// [FIX: options array dipindah ke module scope — mencegah re-alokasi memori di setiap render lokal]
const QUICK_LOG_OPTIONS = [
  { amount: 250, label: 'Glass', icon: 'water-outline', family: 'Ionicons' },
  { amount: 350, label: 'Mug', icon: 'cafe-outline', family: 'Ionicons' },
  { amount: 500, label: 'Bottle', icon: 'bottle-soda-outline', family: 'MaterialCommunityIcons' },
  { amount: 0, label: 'Custom', icon: 'create-outline', suffix: 'ml', family: 'Ionicons' },
] as const;

const QuickLogPanel = memo(({ isAdding, onQuickAdd, onCustomOpen }: { isAdding: boolean, onQuickAdd: (amount: number, label: string) => void, onCustomOpen: () => void }) => (
  <>
    <View className="flex-row items-center mb-4">
      <Ionicons name="add-circle-outline" size={20} color="#0369A1" style={{ marginRight: 6 }} />
      <Text className="text-[22px] font-black text-[#0F172A]" accessibilityRole="header">Quick Log</Text>
    </View>
    <View className="flex-row justify-between mb-8 gap-3">
      {/* [FIX: Ganti key={idx} ke key={item.label} — index sebagai key menyebabkan bug rekonsiliasi React] */}
      {QUICK_LOG_OPTIONS.map((item) => (
        <TouchableOpacity
          key={item.label}
          disabled={isAdding}
          accessibilityRole="button"
          accessibilityLabel={`Add ${item.amount > 0 ? item.amount : 'Custom'} ${item.amount > 0 ? 'ml' : ''} ${item.label}`}
          onPress={() => item.amount > 0 ? onQuickAdd(item.amount, item.label) : onCustomOpen()}
          className={`flex-1 rounded-[30px] py-4 px-2 items-center justify-center shadow-sm ${item.amount === 0 ? 'bg-[#E0F2FE]' : 'bg-white border border-[#F1F5F9]'} ${isAdding ? 'opacity-50' : 'opacity-100'}`}
        >
          <View className={`w-10 h-10 rounded-full items-center justify-center mb-3 ${item.amount === 0 ? 'bg-transparent' : 'bg-[#F0F9FF]'}`}>
            {item.family === 'MaterialCommunityIcons' ? (
              <MaterialCommunityIcons name={item.icon as any} size={22} color="#0369A1" />
            ) : (
              <Ionicons name={item.icon as any} size={20} color="#0369A1" />
            )}
          </View>
          <Text numberOfLines={1} className="text-[#0F172A] font-black text-[13px] mb-0.5">
            {item.amount > 0 ? `+${item.amount}` : item.label}
          </Text>
          <Text className="text-slate-500 font-bold text-[10px]">
            {'suffix' in item ? item.suffix : item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </>
));
QuickLogPanel.displayName = 'QuickLogPanel';

const CadenceStats = memo(({ logsCount, currentVolume, target, intervalMins, ratePerHour }: { logsCount: number, currentVolume: number, target: number, intervalMins: number, ratePerHour: number }) => (
  <>
    <View className="mb-4">
      <Text className="text-slate-500 text-[11px] font-bold tracking-widest uppercase">Hydration Cadence</Text>
    </View>
    <View className="flex-row justify-between gap-3 mb-8">
      <View className="flex-1 bg-white rounded-[20px] p-4 shadow-sm border border-[#F1F5F9]">
        <Text className="text-[#0F172A] font-bold text-xs mb-1">Streak</Text>
        <Text className="text-[#0F172A] font-black text-base mb-1" accessibilityLabel={`${logsCount} logs recorded`}>
          {logsCount > 0 ? `${logsCount} Logs` : '0 Logs'}
        </Text>
        <Text className={`font-semibold text-[10px] ${currentVolume >= target ? 'text-[#10B981]' : 'text-[#0369A1]'}`}>
          {currentVolume >= target ? 'Goal achieved!' : 'Keep going!'}
        </Text>
      </View>
      <View className="flex-1 bg-white rounded-[20px] p-4 shadow-sm border border-[#F1F5F9]">
        <Text className="text-[#0F172A] font-bold text-xs mb-1">Interval</Text>
        <Text className="text-[#0F172A] font-black text-base mb-1" accessibilityLabel={`Drink interval is ${intervalMins} minutes`}>{intervalMins} min</Text>
        <Text className="text-[#0369A1] font-semibold text-[10px]">Steady pace</Text>
      </View>
      <View className="flex-1 bg-white rounded-[20px] p-4 shadow-sm border border-[#F1F5F9]">
        <Text className="text-[#0F172A] font-bold text-xs mb-1">Rate</Text>
        <Text className="text-[#0F172A] font-black text-base mb-1" accessibilityLabel={`Drink rate is ${ratePerHour} milliliters per hour`}>{ratePerHour} ml/h</Text>
        <Text className="text-slate-500 font-semibold text-[10px]">Optimal zone</Text>
      </View>
    </View>
  </>
));
CadenceStats.displayName = 'CadenceStats';

const getSubtitles = (type: string): { subtitle: string; displayName: string } => {
  switch (type) {
    case 'Glass': return { subtitle: 'Focus block', displayName: 'Desk Glass' };
    case 'Bottle': return { subtitle: 'Cardio reload', displayName: 'Post-Walk Water Bottle' };
    case 'Mug': return { subtitle: 'Meal companion', displayName: 'Lunch Refill' };
    default: return { subtitle: 'Custom intake', displayName: type };
  }
};

const IntakeList = memo(({ logs, onDelete }: { logs: IntakeLog[], onDelete: (id: number) => void }) => (
  <>
    <View className="flex-row justify-between items-center mb-4">
      <View className="flex-row items-center">
        <Text className="text-[20px] font-black text-[#0F172A] mr-3" accessibilityRole="header">Today&apos;s Intake Log</Text>
        <View className="bg-[#BAE6FD] px-3 py-1 rounded-full">
          <Text className="text-[#0369A1] font-bold text-[10px]" accessibilityLabel={`${logs.length} entries total`}>{logs.length} entries</Text>
        </View>
      </View>
    </View>
    <View className="mb-8">
      {logs.map((log) => {
        const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const { subtitle, displayName } = getSubtitles(log.drink_type);

        return (
          <View key={log.id} className="bg-white rounded-[24px] p-4 mb-3 shadow-sm border border-slate-100 flex-row items-center">
            <View className="w-12 h-12 rounded-full bg-[#E0F2FE] items-center justify-center mr-4">
              <Ionicons name="water" size={20} color="#0284c7" />
            </View>
            <View className="flex-1">
              <Text className="text-[#0F172A] font-bold text-[13px] mb-0.5">{displayName}</Text>
              <View className="flex-row items-center">
                <Text className="text-slate-500 font-semibold text-[10px] mr-2" accessibilityLabel={`at ${timeStr}`}>{timeStr}</Text>
                <View className="w-1 h-1 rounded-full bg-slate-300 mr-2" />
                <Text className="text-[#059669] font-semibold text-[10px]">{subtitle}</Text>
              </View>
            </View>
            <Text className="text-[#0369A1] font-black text-sm mr-4" accessibilityLabel={`Added ${log.amount} milliliters`}>+{log.amount} ml</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Delete log entry for ${displayName}`} onPress={() => onDelete(log.id)} className="p-2">
              <Ionicons name="trash-outline" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        );
      })}
      {logs.length === 0 && (
        <Text className="text-center text-slate-400 mt-4 font-semibold" accessibilityRole="text">No entries yet today.</Text>
      )}
    </View>
  </>
));
IntakeList.displayName = 'IntakeList';

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

  useEffect(() => {
    loadData();
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
  if (isLoading && logs.length === 0) {
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
