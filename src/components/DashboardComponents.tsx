import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { IntakeLog } from '../store/useHydrationStore';
import { LinearGradient } from 'expo-linear-gradient';
import CircularProgress from './CircularProgress';

export const HeroCard = memo(({ progressPercent, progress, target, currentVolume, leftVolume }: { progressPercent: number, progress: number, target: number, currentVolume: number, leftVolume: number }) => (
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

const QUICK_LOG_OPTIONS = [
  { amount: 250, label: 'Glass', icon: 'water-outline', family: 'Ionicons' },
  { amount: 350, label: 'Mug', icon: 'cafe-outline', family: 'Ionicons' },
  { amount: 500, label: 'Bottle', icon: 'bottle-soda-outline', family: 'MaterialCommunityIcons' },
  { amount: 0, label: 'Custom', icon: 'create-outline', suffix: 'ml', family: 'Ionicons' },
] as const;

export const QuickLogPanel = memo(({ isAdding, onQuickAdd, onCustomOpen }: { isAdding: boolean, onQuickAdd: (amount: number, label: string) => void, onCustomOpen: () => void }) => (
  <>
    <View className="flex-row items-center mb-4">
      <Ionicons name="add-circle-outline" size={20} color="#0369A1" style={{ marginRight: 6 }} />
      <Text className="text-[22px] font-black text-[#0F172A]" accessibilityRole="header">Quick Log</Text>
    </View>
    <View className="flex-row justify-between mb-8 gap-3">
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

export const CadenceStats = memo(({ logsCount, currentVolume, target, intervalMins, ratePerHour }: { logsCount: number, currentVolume: number, target: number, intervalMins: number, ratePerHour: number }) => (
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

export const IntakeList = memo(({ logs, onDelete }: { logs: IntakeLog[], onDelete: (id: number) => void }) => (
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
