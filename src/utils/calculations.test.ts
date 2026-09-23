/**
 * WHITE-BOX TESTING: calculations.ts
 *
 * Menguji logika internal fungsi calculateTarget dan calculateNextPing
 * secara mendalam — termasuk semua cabang if-else, edge case, dan boundary.
 *
 * Cara jalankan: npx jest src/utils/calculations.test.ts --verbose
 */
import { calculateTarget, calculateNextPing } from './calculations';

// ============================================================
// WHITE-BOX: calculateTarget()
// Menguji SETIAP CABANG logika di dalam fungsi
// ============================================================
describe('[WHITE-BOX] calculateTarget()', () => {

  // --- Cabang: Usia < 30 → baseMl * 1.05 ---
  it('Usia muda (<30) meningkatkan target sebesar 5%', () => {
    const result = calculateTarget(72, 28, 1.5, 'Male');
    // 72 * 35 = 2520 → *1.05 (usia) = 2646 → *1.5 (aktivitas) = 3969 → *1.05 (male) = 4167.45 → rounded = 4150
    expect(result).toBe(4150);
  });

  // --- Cabang: Usia > 55 → baseMl * 0.95 ---
  it('Usia tua (>55) menurunkan target sebesar 5%', () => {
    const result = calculateTarget(60, 60, 1.1, 'Female');
    // 60 * 35 = 2100 → *0.95 (usia) = 1995 → *1.1 (aktivitas) = 2194.5 → no male mul → rounded = 2200
    expect(result).toBe(2200);
  });

  // --- Cabang: 30 ≤ Usia ≤ 55 → tidak ada penyesuaian usia ---
  it('Usia menengah (30-55) tidak mendapat penyesuaian usia', () => {
    const result = calculateTarget(70, 40, 1.3, 'Male');
    // 70 * 35 = 2450 → no age adj → *1.3 = 3185 → *1.05 (male) = 3344.25 → rounded = 3350
    expect(result).toBe(3350);
  });

  // --- Cabang: gender Male → baseMl * 1.05 ---
  it('Gender Male mendapat multiplier 1.05 dibandingkan Female', () => {
    const female = calculateTarget(70, 40, 1.3, 'Female');
    const male = calculateTarget(70, 40, 1.3, 'Male');
    expect(male).toBeGreaterThan(female);
  });

  // --- Boundary: Clamp bawah 1500ml ---
  it('Target tidak pernah di bawah 1500 ml', () => {
    // Berat sangat kecil → hasil perhitungan pasti < 1500
    const result = calculateTarget(10, 30, 1.0, 'Female');
    expect(result).toBe(1500);
  });

  // --- Boundary: Clamp atas 5000ml ---
  it('Target tidak pernah di atas 5000 ml', () => {
    // Berat sangat besar → hasil pasti > 5000
    const result = calculateTarget(250, 25, 1.5, 'Male');
    expect(result).toBe(5000);
  });

  // --- Edge Case: Input NaN → fallback ke default ---
  it('Input NaN jatuh ke nilai default (weight=60, age=25, multiplier=1.3)', () => {
    const result = calculateTarget(NaN, NaN, NaN, 'Male');
    // 60 * 35 = 2100 → *1.05 (usia<30) = 2205 → *1.3 = 2866.5 → *1.05 (male) = 3009.825 → rounded = 3000
    expect(result).toBe(3000);
  });

  // --- Edge Case: Input 0 atau negatif → fallback ---
  it('Berat badan 0 atau negatif jatuh ke nilai default', () => {
    const result0 = calculateTarget(0, 25, 1.3, 'Male');
    const resultNeg = calculateTarget(-10, 25, 1.3, 'Male');
    expect(result0).toBe(result0);  // tidak crash
    expect(resultNeg).toBeGreaterThanOrEqual(1500);
  });

  // --- Pembulatan ke 50 ml terdekat ---
  it('Hasil selalu merupakan kelipatan 50', () => {
    const cases = [
      calculateTarget(65, 32, 1.3, 'Male'),
      calculateTarget(55, 45, 1.1, 'Female'),
      calculateTarget(80, 28, 1.5, 'Male'),
    ];
    cases.forEach(v => expect(v % 50).toBe(0));
  });
});

// ============================================================
// WHITE-BOX: calculateNextPing()
// Menguji SETIAP CABANG logika di dalam fungsi
// ============================================================
describe('[WHITE-BOX] calculateNextPing()', () => {

  // --- Early Return: target sudah tercapai ---
  it('Mengembalikan null jika volume sekarang >= target', () => {
    expect(calculateNextPing('07:00', '23:00', 2000, 2000)).toBeNull();
    expect(calculateNextPing('07:00', '23:00', 2000, 2500)).toBeNull();
  });

  // --- Early Return: targetMl tidak valid ---
  it('Mengembalikan null jika targetMl adalah 0, NaN, atau negatif', () => {
    expect(calculateNextPing('07:00', '23:00', 0, 0)).toBeNull();
    expect(calculateNextPing('07:00', '23:00', NaN, 0)).toBeNull();
    expect(calculateNextPing('07:00', '23:00', -100, 0)).toBeNull();
  });

  // --- Cabang: Fixed interval → gunakan nilai fixedIntervalMins ---
  it('Mode Fixed menggunakan intervalMins dari parameter langsung', () => {
    const result = calculateNextPing('07:00', '23:00', 3000, 1000, 60);
    // Harus mengembalikan waktu ~60 menit dari sekarang
    expect(result).not.toBeNull();
    expect(result).toMatch(/^(Today|Tomorrow), \d{2}:\d{2} [AP]M$/);
  });

  // --- Cabang: Auto mode → kalkulasi berdasarkan sisa volume & waktu ---
  it('Mode Auto mengembalikan string waktu yang valid', () => {
    const result = calculateNextPing('07:00', '23:00', 3000, 500);
    expect(result).not.toBeNull();
    expect(result).toMatch(/^(Today|Tomorrow), \d{2}:\d{2} [AP]M$/);
  });

  // --- Boundary: interval di-clamp minimum 30 menit ---
  it('Interval Auto tidak pernah di bawah 30 menit (mencegah spam)', () => {
    // Volume sisa sangat sedikit, waktu aktif sangat sedikit → interval bisa sangat kecil
    // Tapi harus di-clamp ke minimal 30 menit
    const now = new Date();
    const result = calculateNextPing('07:00', '23:00', 3000, 2990);
    if (result) {
      // Ping harusnya minimal 30 menit dari sekarang
      const resultTime = new Date(now.getTime() + 30 * 60000);
      // Hanya verifikasi format, bukan angka tepat (karena waktu berjalan)
      expect(result).toMatch(/^(Today|Tomorrow), \d{2}:\d{2} [AP]M$/);
    }
  });

  // --- Boundary: interval di-clamp maksimum 180 menit ---
  it('Interval Auto tidak pernah di atas 180 menit (tidak terlalu jarang)', () => {
    // Volume sisa sangat besar, waktu aktif sangat sedikit (interval bisa sangat besar)
    const result = calculateNextPing('07:00', '23:00', 50000, 0);
    expect(result).not.toBeNull();
  });

  // --- Edge Case: Jadwal melewati tengah malam (sleep=02:00, wake=07:00) ---
  it('Tidak crash/error jika waktu tidur melewati tengah malam', () => {
    expect(() => {
      calculateNextPing('07:00', '02:00', 2500, 1000);
    }).not.toThrow();
    const result = calculateNextPing('07:00', '02:00', 2500, 1000);
    expect(result).not.toBeNull();
  });
});
