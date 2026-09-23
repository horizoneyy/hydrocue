export const calculateTarget = (
  weight: number,
  age: number,
  activityMultiplier: number,
  gender: 'Male' | 'Female'
): number => {
  // Edge Case Protection: Fallback for NaN or zero/negative inputs
  const safeWeight = isNaN(weight) || weight <= 0 ? 60 : weight;
  const safeAge = isNaN(age) || age <= 0 ? 25 : age;
  const safeMultiplier = isNaN(activityMultiplier) || activityMultiplier <= 0 ? 1.3 : activityMultiplier;

  // Baseline (Weight * 35 ml) calibrated by age and energy
  let baseMl = safeWeight * 35; 
  
  // Age calibration
  if (safeAge < 30) baseMl *= 1.05;
  else if (safeAge > 55) baseMl *= 0.95;

  // Energy calibration
  baseMl *= safeMultiplier;
  
  // Male/Female slight variance (usually male has higher TBW)
  if (gender === 'Male') baseMl *= 1.05;

  // Clamp boundaries between 1500ml and 5000ml rounded to nearest 50
  return Math.min(Math.max(Math.round(baseMl / 50) * 50, 1500), 5000);
};

export const calculateNextPing = (
  wakeTime: string,
  sleepTime: string,
  targetMl: number,
  currentVolume: number,
  fixedIntervalMins?: number
): string | null => {
  if (!targetMl || isNaN(targetMl) || targetMl <= 0) return null;
  if (currentVolume >= targetMl) return null;
  
  let intervalMins: number;

  if (fixedIntervalMins && fixedIntervalMins > 0) {
    // Fixed Cadence: bypass adaptive logic completely
    intervalMins = fixedIntervalMins;
  } else {
    // Smart Adaptive Flow: dynamically calculate based on remaining volume and remaining awake time
    const safeWake = wakeTime || '07:00';
    const safeSleep = sleepTime || '23:00';
    
    const wakeHour = parseInt(safeWake.split(':')[0], 10) || 7;
    const sleepHour = parseInt(safeSleep.split(':')[0], 10) || 23;
    const sleepMin = parseInt(safeSleep.split(':')[1], 10) || 0;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    const nowMins = currentHour * 60 + currentMin;
    let sleepTotalMins = sleepHour * 60 + sleepMin;
    
    // Logic Bug Fix: Handle sleep schedule crossing midnight (e.g. Wake 07:00, Sleep 02:00)
    if (sleepTotalMins <= wakeHour * 60) {
      sleepTotalMins += 24 * 60; 
    }

    let currentAdjustedMins = nowMins;
    // Align current time if we are past midnight but haven't slept yet
    if (currentHour < wakeHour && sleepTotalMins > 24 * 60) {
       currentAdjustedMins += 24 * 60;
    }

    let remainingActiveMins = sleepTotalMins - currentAdjustedMins;
    
    // If the user is currently in quiet hours (sleeping) or edge case hit
    if (remainingActiveMins <= 0) {
       let activeHours = sleepHour - wakeHour;
       if (activeHours <= 0) activeHours += 24;
       remainingActiveMins = activeHours * 60; 
    }

    const remainingVolume = Math.max(0, targetMl - currentVolume);
    const drinksNeeded = Math.max(1, Math.ceil(remainingVolume / 250)); // Assume 250ml per standard drink
    
    intervalMins = remainingActiveMins / drinksNeeded;
    
    // Performance/UX: Clamp interval to prevent spam (min 30m) or extremely sparse pings (max 180m)
    intervalMins = Math.max(30, Math.min(intervalMins, 180));
  }

  const now = new Date();
  const nextPing = new Date(now.getTime() + intervalMins * 60000);
  
  const formattedTime = nextPing.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dayPrefix = nextPing.getDate() !== now.getDate() ? 'Tomorrow' : 'Today';
  
  return `${dayPrefix}, ${formattedTime}`;
};
