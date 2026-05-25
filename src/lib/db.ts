import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "mail-car.db");

let db: Database.Database | null = null;

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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cdks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        account_id INTEGER NOT NULL,
        user_name TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
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
  }
  return db;
}

export interface Account {
  id: number;
  email: string;
  password: string;
  status: string;
  note: string;
  created_at: string;
}

export interface Cdk {
  id: number;
  code: string;
  account_id: number;
  user_name: string;
  status: string;
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
export function createAccount(email: string, password?: string, note?: string) {
  return getDb().prepare("INSERT INTO accounts (email, password, note) VALUES (?, ?, ?)").run(email, password || "", note || "");
}
export function getAllAccounts(): Account[] {
  return getDb().prepare("SELECT * FROM accounts ORDER BY created_at DESC").all() as Account[];
}
export function getAccountById(id: number): Account | undefined {
  return getDb().prepare("SELECT * FROM accounts WHERE id = ?").get(id) as Account | undefined;
}
export function deleteAccount(id: number) {
  return getDb().prepare("DELETE FROM accounts WHERE id = ?").run(id);
}
export function updateAccount(id: number, email: string, password: string, note: string, status: string) {
  return getDb().prepare("UPDATE accounts SET email = ?, password = ?, note = ?, status = ? WHERE id = ?").run(email, password, note, status, id);
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
