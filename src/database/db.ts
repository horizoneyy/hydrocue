import * as SQLite from 'expo-sqlite';

// Singleton pattern – satu koneksi DB dipakai seluruh app
// Mencegah overhead buka koneksi baru pada setiap query
let _db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;

  _db = await SQLite.openDatabaseAsync('hydrocue_v2.db');

  // Create base tables
  await _db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY,
      gender TEXT, age INTEGER, weight REAL, height REAL, activity_level TEXT,
      daily_target_ml INTEGER, wake_time TEXT, sleep_time TEXT,
      notif_mode TEXT, manual_interval_min INTEGER
    );
    CREATE TABLE IF NOT EXISTS intake_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT, timestamp INTEGER, amount INTEGER, drink_type TEXT
    );
    CREATE TABLE IF NOT EXISTS daily_summary (
      date TEXT PRIMARY KEY, total_drank_ml INTEGER,
      target_ml INTEGER, is_goal_reached INTEGER
    );
  `);

  // Safe column migrations – kolom baru ditambahkan tanpa merusak data lama
  const migrations = [
    `ALTER TABLE user_profile ADD COLUMN chime_enabled INTEGER DEFAULT 1`,
    `ALTER TABLE user_profile ADD COLUMN haptics_enabled INTEGER DEFAULT 1`,
    `ALTER TABLE user_profile ADD COLUMN high_priority_enabled INTEGER DEFAULT 1`,
  ];
  for (const sql of migrations) {
    try {
      await _db.runAsync(sql);
    } catch {
      // Kolom sudah ada – aman diabaikan
    }
  }

  const firstUser = await _db.getFirstAsync('SELECT * FROM user_profile WHERE id = 1');
  if (!firstUser) {
    await _db.runAsync(
      `INSERT INTO user_profile (id, notif_mode, manual_interval_min, chime_enabled, haptics_enabled, high_priority_enabled) VALUES (1, 'Auto', 60, 1, 1, 1)`
    );
  }

  return _db;
}
