import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.env.DATA_DIR || process.cwd(), "mail-car.db");

let db: Database.Database | null = null;

function dateFromLegacyNote(note: string) {
  if (!/(续费|到期)/.test(note)) return null;
  const full = note.match(/(20\d{2})[./-](\d{1,2})[./-](\d{1,2})/);
  const short = note.match(/(?:^|\D)(\d{1,2})[./-](\d{1,2})(?:\D|$)/);
  const now = new Date();
  let year = full ? Number(full[1]) : now.getFullYear();
  const month = Number(full ? full[2] : short?.[1]);
  const day = Number(full ? full[3] : short?.[2]);
  if (!month || !day) return null;

  let candidate = new Date(year, month - 1, day);
  if (!full && candidate.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
    year += 1;
    candidate = new Date(year, month - 1, day);
  }
  if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        note TEXT DEFAULT '',
        expires_at DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cdks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        account_id INTEGER NOT NULL,
        user_name TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        last_used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS fetch_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        cdk_id INTEGER NOT NULL,
        user_name TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (cdk_id) REFERENCES cdks(id) ON DELETE CASCADE
      );
    `);

    // Existing production databases are migrated in place.
    const accountColumns = db.prepare("PRAGMA table_info(accounts)").all() as { name: string }[];
    if (!accountColumns.some((column) => column.name === "expires_at")) {
      db.exec("ALTER TABLE accounts ADD COLUMN expires_at DATE");
    }

    const legacyAccounts = db.prepare("SELECT id, note FROM accounts WHERE expires_at IS NULL AND note != ''").all() as { id: number; note: string }[];
    const backfillExpiry = db.prepare("UPDATE accounts SET expires_at = ? WHERE id = ? AND expires_at IS NULL");
    const migrateLegacyNotes = db.transaction(() => {
      for (const account of legacyAccounts) {
        const expiresAt = dateFromLegacyNote(account.note);
        if (expiresAt) backfillExpiry.run(expiresAt, account.id);
      }
    });
    migrateLegacyNotes();
  }
  return db;
}

export interface Account {
  id: number;
  email: string;
  password: string;
  status: string;
  note: string;
  expires_at: string | null;
  created_at: string;
}

export interface AccountSummary extends Account {
  total_cdks: number;
  active_cdks: number;
  disabled_cdks: number;
  total_fetches: number;
  last_used_at: string | null;
  cdk_codes: string;
}

export interface Cdk {
  id: number;
  code: string;
  account_id: number;
  user_name: string;
  status: string;
  last_used_at: string | null;
  created_at: string;
}

export interface CdkWithEmail extends Cdk {
  email: string;
}

export interface FetchLog {
  id: number;
  account_id: number;
  cdk_id: number;
  user_name: string;
  created_at: string;
}

export interface FetchStat {
  user_name: string;
  count: number;
  last_fetch: string;
}

// ---- Account ----
export function createAccount(email: string, password?: string, note?: string, expiresAt?: string | null) {
  return getDb().prepare("INSERT INTO accounts (email, password, note, expires_at) VALUES (?, ?, ?, ?)").run(email, password || "", note || "", expiresAt || null);
}
export function getAllAccounts(): AccountSummary[] {
  return getDb().prepare(`
    SELECT
      accounts.*,
      COUNT(DISTINCT cdks.id) AS total_cdks,
      COUNT(DISTINCT CASE WHEN cdks.status = 'active' THEN cdks.id END) AS active_cdks,
      COUNT(DISTINCT CASE WHEN cdks.status = 'disabled' THEN cdks.id END) AS disabled_cdks,
      COUNT(fetch_logs.id) AS total_fetches,
      MAX(fetch_logs.created_at) AS last_used_at,
      COALESCE(GROUP_CONCAT(DISTINCT cdks.code), '') AS cdk_codes
    FROM accounts
    LEFT JOIN cdks ON accounts.id = cdks.account_id
    LEFT JOIN fetch_logs ON cdks.id = fetch_logs.cdk_id
    GROUP BY accounts.id
    ORDER BY
      CASE WHEN accounts.expires_at IS NULL THEN 1 ELSE 0 END,
      accounts.expires_at ASC,
      accounts.created_at DESC
  `).all() as AccountSummary[];
}
export function getAccountById(id: number): Account | undefined {
  return getDb().prepare("SELECT * FROM accounts WHERE id = ?").get(id) as Account | undefined;
}
export function deleteAccount(id: number) {
  return getDb().prepare("DELETE FROM accounts WHERE id = ?").run(id);
}
export function updateAccount(id: number, email: string, password: string, note: string, status: string, expiresAt?: string | null) {
  return getDb().prepare("UPDATE accounts SET email = ?, password = ?, note = ?, status = ?, expires_at = ? WHERE id = ?").run(email, password, note, status, expiresAt || null, id);
}

// ---- CDK ----
export function createCdk(code: string, accountId: number, userName?: string) {
  return getDb().prepare("INSERT INTO cdks (code, account_id, user_name) VALUES (?, ?, ?)").run(code, accountId, userName || "");
}
export function getCdkByCode(code: string): CdkWithEmail | undefined {
  return getDb().prepare(`
    SELECT cdks.*, accounts.email FROM cdks JOIN accounts ON cdks.account_id = accounts.id WHERE cdks.code = ?
  `).get(code) as CdkWithEmail | undefined;
}
export function getCdksByAccount(accountId: number): Cdk[] {
  return getDb().prepare("SELECT * FROM cdks WHERE account_id = ? ORDER BY created_at DESC").all(accountId) as Cdk[];
}
export interface CdkWithCount extends Cdk {
  fetch_count: number;
}
export function getCdksWithCountByAccount(accountId: number): CdkWithCount[] {
  return getDb().prepare(`
    SELECT cdks.*, COALESCE(t.cnt, 0) as fetch_count
    FROM cdks
    LEFT JOIN (SELECT cdk_id, COUNT(*) as cnt FROM fetch_logs GROUP BY cdk_id) t ON cdks.id = t.cdk_id
    WHERE cdks.account_id = ?
    ORDER BY cdks.created_at DESC
  `).all(accountId) as CdkWithCount[];
}
export function deleteCdk(id: number) {
  return getDb().prepare("DELETE FROM cdks WHERE id = ?").run(id);
}
export function updateCdkStatus(id: number, status: string) {
  return getDb().prepare("UPDATE cdks SET status = ? WHERE id = ?").run(status, id);
}
export function updateCdkUserName(id: number, userName: string) {
  return getDb().prepare("UPDATE cdks SET user_name = ? WHERE id = ?").run(userName, id);
}

// ---- Fetch Logs ----
export function addFetchLog(accountId: number, cdkId: number, userName: string) {
  return getDb().prepare("INSERT INTO fetch_logs (account_id, cdk_id, user_name) VALUES (?, ?, ?)").run(accountId, cdkId, userName);
}
export function getFetchStatsByAccount(accountId: number): FetchStat[] {
  return getDb().prepare(`
    SELECT user_name, COUNT(*) as count, MAX(created_at) as last_fetch
    FROM fetch_logs WHERE account_id = ? GROUP BY user_name ORDER BY count DESC
  `).all(accountId) as FetchStat[];
}
export function getFetchLogsByAccount(accountId: number, limit = 50): FetchLog[] {
  return getDb().prepare("SELECT * FROM fetch_logs WHERE account_id = ? ORDER BY created_at DESC LIMIT ?").all(accountId, limit) as FetchLog[];
}
export function getFetchLogsByCdk(cdkId: number, limit = 20): FetchLog[] {
  return getDb().prepare("SELECT * FROM fetch_logs WHERE cdk_id = ? ORDER BY created_at DESC LIMIT ?").all(cdkId, limit) as FetchLog[];
}

// ---- Statistics ----
export interface DashboardStats {
  totalAccounts: number;
  activeAccounts: number;
  disabledAccounts: number;
  totalCdks: number;
  activeCdks: number;
  disabledCdks: number;
  todayFetches: number;
  weekFetches: number;
  monthFetches: number;
  unusedCdks: number;
  expiring7Days: number;
  expiring30Days: number;
  expiredAccounts: number;
}

export function getDashboardStats(): DashboardStats {
  const db = getDb();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const totalAccounts = db.prepare("SELECT COUNT(*) as count FROM accounts").get() as { count: number };
  const activeAccounts = db.prepare("SELECT COUNT(*) as count FROM accounts WHERE status = 'active'").get() as { count: number };
  const disabledAccounts = db.prepare("SELECT COUNT(*) as count FROM accounts WHERE status = 'disabled'").get() as { count: number };
  const totalCdks = db.prepare("SELECT COUNT(*) as count FROM cdks").get() as { count: number };
  const activeCdks = db.prepare("SELECT COUNT(*) as count FROM cdks WHERE status = 'active'").get() as { count: number };
  const disabledCdks = db.prepare("SELECT COUNT(*) as count FROM cdks WHERE status = 'disabled'").get() as { count: number };
  const todayFetches = db.prepare("SELECT COUNT(*) as count FROM fetch_logs WHERE created_at >= ?").get(todayStart) as { count: number };
  const weekFetches = db.prepare("SELECT COUNT(*) as count FROM fetch_logs WHERE created_at >= ?").get(weekStart) as { count: number };
  const monthFetches = db.prepare("SELECT COUNT(*) as count FROM fetch_logs WHERE created_at >= ?").get(monthStart) as { count: number };
  const unusedCdks = db.prepare("SELECT COUNT(*) as count FROM cdks WHERE id NOT IN (SELECT DISTINCT cdk_id FROM fetch_logs)").get() as { count: number };
  const expiring7Days = db.prepare("SELECT COUNT(*) as count FROM accounts WHERE status = 'active' AND expires_at IS NOT NULL AND date(expires_at) BETWEEN date('now', 'localtime') AND date('now', 'localtime', '+7 days')").get() as { count: number };
  const expiring30Days = db.prepare("SELECT COUNT(*) as count FROM accounts WHERE status = 'active' AND expires_at IS NOT NULL AND date(expires_at) BETWEEN date('now', 'localtime') AND date('now', 'localtime', '+30 days')").get() as { count: number };
  const expiredAccounts = db.prepare("SELECT COUNT(*) as count FROM accounts WHERE expires_at IS NOT NULL AND date(expires_at) < date('now', 'localtime')").get() as { count: number };

  return {
    totalAccounts: totalAccounts.count,
    activeAccounts: activeAccounts.count,
    disabledAccounts: disabledAccounts.count,
    totalCdks: totalCdks.count,
    activeCdks: activeCdks.count,
    disabledCdks: disabledCdks.count,
    todayFetches: todayFetches.count,
    weekFetches: weekFetches.count,
    monthFetches: monthFetches.count,
    unusedCdks: unusedCdks.count,
    expiring7Days: expiring7Days.count,
    expiring30Days: expiring30Days.count,
    expiredAccounts: expiredAccounts.count,
  };
}

export interface TrendData {
  date: string;
  count: number;
}

export function getFetchTrend(days = 7): TrendData[] {
  const db = getDb();
  return db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM fetch_logs
    WHERE created_at >= datetime('now', '-${days} days')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).all() as TrendData[];
}

export interface AccountUsage {
  email: string;
  total_cdks: number;
  active_cdks: number;
  total_fetches: number;
  last_used: string | null;
}

export function getAccountUsage(): AccountUsage[] {
  return getDb().prepare(`
    SELECT
      accounts.email,
      COUNT(DISTINCT cdks.id) as total_cdks,
      COUNT(DISTINCT CASE WHEN cdks.status = 'active' THEN cdks.id END) as active_cdks,
      COUNT(fetch_logs.id) as total_fetches,
      MAX(fetch_logs.created_at) as last_used
    FROM accounts
    LEFT JOIN cdks ON accounts.id = cdks.account_id
    LEFT JOIN fetch_logs ON cdks.id = fetch_logs.cdk_id
    WHERE accounts.status = 'active'
    GROUP BY accounts.id
    ORDER BY total_fetches DESC
  `).all() as AccountUsage[];
}

export interface ExpiringSoon {
  id: number;
  expires_at: string;
  days_remaining: number;
  status: string;
  note: string;
  total_cdks: number;
  active_cdks: number;
  email: string;
}

export function getExpiringSoon(days = 30): ExpiringSoon[] {
  return getDb().prepare(`
    SELECT
      accounts.id,
      accounts.email,
      accounts.note,
      accounts.status,
      accounts.expires_at,
      CAST(julianday(accounts.expires_at) - julianday(date('now', 'localtime')) AS INTEGER) AS days_remaining,
      COUNT(cdks.id) AS total_cdks,
      COUNT(CASE WHEN cdks.status = 'active' THEN 1 END) AS active_cdks
    FROM accounts
    LEFT JOIN cdks ON accounts.id = cdks.account_id
    WHERE accounts.expires_at IS NOT NULL
      AND date(accounts.expires_at) <= date('now', 'localtime', '+' || ? || ' days')
    GROUP BY accounts.id
    ORDER BY accounts.expires_at ASC
    LIMIT 100
  `).all(days) as ExpiringSoon[];
}

export function updateCdkLastUsed(cdkId: number) {
  return getDb().prepare("UPDATE cdks SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?").run(cdkId);
}
