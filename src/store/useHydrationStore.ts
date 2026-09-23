import { create } from 'zustand';
import { getDatabase } from '../database/db';
import { Alert } from 'react-native';

export interface IntakeLog {
  id: number;
  date: string;
  timestamp: number;
  amount: number;
  drink_type: string;
}

export interface UserProfile {
  gender: 'Male' | 'Female';
  age: number;
  weight: number;
  height: number;
  activity_level: string;
  wake_time: string;
  sleep_time: string;
  notif_mode: string;
  manual_interval_min: number;
  chime_enabled: boolean;
  haptics_enabled: boolean;
  high_priority_enabled: boolean;
}

interface HydrationState {
  currentVolume: number;
  target: number;
  logs: IntakeLog[];
  userProfile: UserProfile;
  isLoading: boolean;
  loadData: () => Promise<void>;
  addIntake: (amount: number, drinkType: string) => Promise<void>;
  deleteIntake: (id: number) => Promise<void>;
  wipeDatabase: () => Promise<void>;
  setTarget: (target: number) => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

const defaultProfile: UserProfile = {
  gender: 'Male',
  age: 28,
  weight: 72,
  height: 178,
  activity_level: 'Moderate',
  wake_time: '07:00',
  sleep_time: '23:00',
  notif_mode: 'Auto',
  manual_interval_min: 60,
  chime_enabled: true,
  haptics_enabled: true,
  high_priority_enabled: true,
};

export const useHydrationStore = create<HydrationState>((set, get) => ({
  currentVolume: 0,
  target: 2850,
  logs: [],
  userProfile: defaultProfile,
  isLoading: false,

  loadData: async () => {
    set({ isLoading: true });
    try {
      const db = await getDatabase();
      const today = new Date().toISOString().split('T')[0];
      
      // Parallel execution for efficiency
      const [summary, logs, user] = await Promise.all([
        db.getFirstAsync('SELECT * FROM daily_summary WHERE date = ?', [today]) as Promise<any>,
        db.getAllAsync('SELECT * FROM intake_log WHERE date = ? ORDER BY timestamp DESC', [today]) as Promise<IntakeLog[]>,
        db.getFirstAsync('SELECT * FROM user_profile WHERE id = 1') as Promise<any>
      ]);
      
      const profile: UserProfile = user ? {
        gender: user.gender || defaultProfile.gender,
        age: user.age || defaultProfile.age,
        weight: user.weight ?? defaultProfile.weight,
        height: user.height ?? defaultProfile.height,
        activity_level: user.activity_level || defaultProfile.activity_level,
        wake_time: user.wake_time || defaultProfile.wake_time,
        sleep_time: user.sleep_time || defaultProfile.sleep_time,
        notif_mode: user.notif_mode || defaultProfile.notif_mode,
        manual_interval_min: user.manual_interval_min ?? defaultProfile.manual_interval_min,
        chime_enabled: user.chime_enabled !== null ? Boolean(user.chime_enabled) : true,
        haptics_enabled: user.haptics_enabled !== null ? Boolean(user.haptics_enabled) : true,
        high_priority_enabled: user.high_priority_enabled !== null ? Boolean(user.high_priority_enabled) : true,
      } : defaultProfile;

      set({
        currentVolume: summary?.total_drank_ml || 0,
        target: summary?.target_ml || user?.daily_target_ml || 2850,
        logs,
        userProfile: profile,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  addIntake: async (amount: number, drinkType: string) => {
    if (!amount || amount <= 0 || !Number.isFinite(amount)) return;
    const safeAmount = Math.min(amount, 5000);

    set({ isLoading: true });
    try {
      const db = await getDatabase();
      const today = new Date().toISOString().split('T')[0];
      const timestamp = Date.now();

      const result = await db.runAsync(
        'INSERT INTO intake_log (date, timestamp, amount, drink_type) VALUES (?, ?, ?, ?)',
        [today, timestamp, safeAmount, drinkType]
      );

      const summary = await db.getFirstAsync('SELECT * FROM daily_summary WHERE date = ?', [today]);
      
      if (summary) {
        await db.runAsync('UPDATE daily_summary SET total_drank_ml = total_drank_ml + ? WHERE date = ?', [safeAmount, today]);
      } else {
        await db.runAsync('INSERT INTO daily_summary (date, total_drank_ml, target_ml) VALUES (?, ?, ?)', [today, safeAmount, get().target]);
      }

      // Optimistic O(1) state update instead of loadData() query roundtrip
      set((state) => ({
        currentVolume: state.currentVolume + safeAmount,
        logs: [{ id: result.lastInsertRowId, date: today, timestamp, amount: safeAmount, drink_type: drinkType }, ...state.logs],
        isLoading: false
      }));
    } catch {
      Alert.alert('Error', 'Gagal menyimpan data minuman.');
      set({ isLoading: false });
    }
  },

  deleteIntake: async (id: number) => {
    if (!id || !Number.isFinite(id)) return;

    set({ isLoading: true });
    try {
      const log = get().logs.find(l => l.id === id);
      if (!log) return set({ isLoading: false });

      const db = await getDatabase();
      await db.runAsync('DELETE FROM intake_log WHERE id = ?', [id]);
      
      const today = new Date().toISOString().split('T')[0];
      await db.runAsync('UPDATE daily_summary SET total_drank_ml = MAX(0, total_drank_ml - ?) WHERE date = ?', [log.amount, today]);

      set((state) => ({
        currentVolume: Math.max(0, state.currentVolume - log.amount),
        logs: state.logs.filter(l => l.id !== id),
        isLoading: false
      }));
    } catch {
      Alert.alert('Error', 'Gagal menghapus data minuman.');
      set({ isLoading: false });
    }
  },

  wipeDatabase: async () => {
    set({ isLoading: true });
    try {
      const db = await getDatabase();
      // Execute sequentially to prevent SQLite busy locks on massive wipes
      await db.runAsync('DELETE FROM user_profile');
      await db.runAsync('DELETE FROM intake_log');
      await db.runAsync('DELETE FROM daily_summary');
      
      set({ currentVolume: 0, logs: [], userProfile: defaultProfile, isLoading: false });
    } catch {
      Alert.alert('Error', 'Gagal mereset database.');
      set({ isLoading: false });
    }
  },

  setTarget: async (target: number) => {
    if (!target || target <= 0 || !Number.isFinite(target)) return;

    try {
      const db = await getDatabase();
      await db.runAsync('UPDATE user_profile SET daily_target_ml = ? WHERE id = 1', [target]);
      
      const today = new Date().toISOString().split('T')[0];
      const summary = await db.getFirstAsync('SELECT * FROM daily_summary WHERE date = ?', [today]);
      
      if (summary) {
        await db.runAsync('UPDATE daily_summary SET target_ml = ? WHERE date = ?', [target, today]);
      } else {
        await db.runAsync('INSERT INTO daily_summary (date, total_drank_ml, target_ml) VALUES (?, ?, ?)', [today, 0, target]);
      }
      
      set({ target });
    } catch {}
  },

  updateUserProfile: async (profileUpdates: Partial<UserProfile>) => {
    set({ isLoading: true });
    try {
      const db = await getDatabase();
      const newProfile: UserProfile = { ...get().userProfile, ...profileUpdates };

      await db.runAsync(
        `UPDATE user_profile SET 
          gender = ?, age = ?, weight = ?, height = ?, 
          activity_level = ?, wake_time = ?, sleep_time = ?, 
          notif_mode = ?, manual_interval_min = ?,
          chime_enabled = ?, haptics_enabled = ?, high_priority_enabled = ?
        WHERE id = 1`,
        [
          newProfile.gender, newProfile.age, newProfile.weight, newProfile.height,
          newProfile.activity_level, newProfile.wake_time, newProfile.sleep_time,
          newProfile.notif_mode, newProfile.manual_interval_min,
          newProfile.chime_enabled ? 1 : 0,
          newProfile.haptics_enabled ? 1 : 0,
          newProfile.high_priority_enabled ? 1 : 0,
        ]
      );

      set({ userProfile: newProfile, isLoading: false });
    } catch {
      Alert.alert('Error', 'Gagal memperbarui profil pengguna.');
      set({ isLoading: false });
    }
  }
}));
