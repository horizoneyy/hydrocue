// [REFACTOR: Tambah getActivityMultiplier sebagai single source of truth — dihapus dari profile.tsx dan settings.tsx]
export const getActivityMultiplier = (level: string): number =>
  level === 'Light' ? 1.1 : level === 'Intense' ? 1.5 : 1.3;

export const calculateTarget = (
  weight: number,
  age: number,
  activityMultiplier: number,
  gender: 'Male' | 'Female'
): number => {
  // [VALIDASI: Fallback untuk input NaN atau negatif]
  const safeWeight = isNaN(weight) || weight <= 0 ? 60 : weight;
  const safeAge = isNaN(age) || age <= 0 ? 25 : age;
  const safeMultiplier = isNaN(activityMultiplier) || activityMultiplier <= 0 ? 1.3 : activityMultiplier;

  let baseMl = safeWeight * 35;

  if (safeAge < 30) baseMl *= 1.05;
  else if (safeAge > 55) baseMl *= 0.95;

  baseMl *= safeMultiplier;

  if (gender === 'Male') baseMl *= 1.05;

  // Clamp antara 1500ml dan 5000ml, dibulatkan ke 50ml terdekat
  return Math.min(Math.max(Math.round(baseMl / 50) * 50, 1500), 5000);
};

export const calculateNextPing = (
  wakeTime: string,
  sleepTime: string,
  targetMl: number,
  currentVolume: number,
  fixedIntervalMins?: number
): string | null => {
  // [EARLY RETURN: Keluar cepat untuk skenario tidak valid]
  if (!targetMl || isNaN(targetMl) || targetMl <= 0) return null;
  if (currentVolume >= targetMl) return null;

  let intervalMins: number;

  if (fixedIntervalMins && fixedIntervalMins > 0) {
    intervalMins = fixedIntervalMins;
  } else {
    const safeWake = wakeTime || '07:00';
    const safeSleep = sleepTime || '23:00';

    const wakeHour = parseInt(safeWake.split(':')[0], 10) || 7;
    const sleepHour = parseInt(safeSleep.split(':')[0], 10) || 23;

    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    // [BUG FIX: Handle jadwal tidur melewati tengah malam]
    let sleepTotalMins = sleepHour * 60;
    const wakeTotalMins = wakeHour * 60;
    if (sleepTotalMins <= wakeTotalMins) sleepTotalMins += 24 * 60;

    // [BUG FIX: Sesuaikan waktu sekarang jika sudah melewati tengah malam sebelum tidur]
    let currentAdjustedMins = nowMins;
    if (now.getHours() < wakeHour && sleepTotalMins > 24 * 60) {
      currentAdjustedMins += 24 * 60;
    }

    let remainingActiveMins = sleepTotalMins - currentAdjustedMins;

    // [EDGE CASE: Jika sedang dalam jam tidur atau ujung waktu, fallback ke full active window]
    if (remainingActiveMins <= 0) {
      const activeHours = Math.max(1, sleepHour - wakeHour + (sleepHour <= wakeHour ? 24 : 0));
      remainingActiveMins = activeHours * 60;
    }

    const remainingVolume = Math.max(0, targetMl - currentVolume);
    const drinksNeeded = Math.max(1, Math.ceil(remainingVolume / 250));
    intervalMins = remainingActiveMins / drinksNeeded;

    // [PRUNING: Hapus variabel sleepMin yang tidak digunakan]
    // Clamp: minimum 30m agar tidak spam, maksimum 180m agar tidak terlalu jarang
    intervalMins = Math.max(30, Math.min(intervalMins, 180));
  }

  const now = new Date();
  const nextPing = new Date(now.getTime() + intervalMins * 60000);
  const formattedTime = nextPing.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dayPrefix = nextPing.getDate() !== now.getDate() ? 'Tomorrow' : 'Today';

  return `${dayPrefix}, ${formattedTime}`;
};
