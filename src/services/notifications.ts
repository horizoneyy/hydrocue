import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useHydrationStore } from '../store/useHydrationStore';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Ensure the Android channel is properly configured with high priority and sound
async function setupNotificationChannel(highPriority: boolean, sound: boolean, vibrate: boolean) {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('hydrocue-alerts', {
        name: 'Hydration Reminders',
        importance: highPriority ? Notifications.AndroidImportance.MAX : Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: vibrate ? [0, 250, 250, 250] : undefined,
        lightColor: '#0284c7',
        sound: sound ? 'default' : undefined,
      });
    } catch (error) {
      console.warn('[HydroCue] Failed to setup notification channel:', error);
    }
  }
}

export async function scheduleOfflineAlarms(targetMl: number, wakeTimeH: number, sleepTimeH: number) {
  if (Platform.OS === 'web') {
    console.log('Skipping push notifications setup on web platform');
    return;
  }
  
  try {
    // Get current user preferences directly from the store state
    const { userProfile } = useHydrationStore.getState();
    const highPriority = userProfile.high_priority_enabled ?? true;
    const soundEnabled = userProfile.chime_enabled ?? true;
    const hapticsEnabled = userProfile.haptics_enabled ?? true;

    await setupNotificationChannel(highPriority, soundEnabled, hapticsEnabled);
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    if (targetMl <= 0) return;

    // Logic Bug Fix: Handle sleep schedule crossing midnight (e.g. Wake 07:00, Sleep 02:00)
    let sleepTotalMins = sleepTimeH * 60;
    const wakeTotalMins = wakeTimeH * 60;
    
    if (sleepTotalMins <= wakeTotalMins) {
      sleepTotalMins += 24 * 60; 
    }
    
    const activeMins = sleepTotalMins - wakeTotalMins;
    const drinksNeeded = Math.max(1, Math.ceil(targetMl / 250));
    
    // Use manual interval if fixed mode is active, otherwise auto-calculate
    const isFixed = userProfile.notif_mode === 'Fixed';
    const intervalMins = isFixed 
      ? (userProfile.manual_interval_min || 75) 
      : activeMins / drinksNeeded;
      
    // Performance limit: schedule max 20 alarms to prevent OS spam/throttle
    const maxAlarms = Math.min(drinksNeeded, 20);
    
    for (let i = 1; i <= maxAlarms; i++) {
      const triggerTotalMins = wakeTotalMins + (i * intervalMins);
      
      // Stop scheduling if it goes past sleep time (absolute minutes comparison)
      if (triggerTotalMins >= sleepTotalMins) break;
      
      // Calculate hour and minute, ensuring hour wraps around at 24 to prevent OS crash
      const rawHour = Math.floor(triggerTotalMins / 60);
      const hour = rawHour % 24; 
      const minute = Math.floor(triggerTotalMins % 60);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Time to Hydrate! 💧",
          body: "Drink a glass of water to reach your daily goal.",
          sound: soundEnabled,
          autoDismiss: false,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour,
          minute,
          repeats: true,
        },
      });
    }
  } catch (error) {
    console.error('[HydroCue] Failed to schedule offline alarms:', error);
  }
}
