import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
export function openDatabase(path) {
  if (path !== ":memory:")
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,phone TEXT NOT NULL UNIQUE,role TEXT NOT NULL CHECK(role IN ('client','seller')),profile TEXT NOT NULL,password_hash TEXT NOT NULL,salt TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS applications(id TEXT PRIMARY KEY,user_id TEXT NOT NULL UNIQUE REFERENCES users(id),shop TEXT NOT NULL,address TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'На проверке',reason TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,decided_by TEXT,decided_at TEXT);
CREATE TABLE IF NOT EXISTS telegram_users(chat_id TEXT PRIMARY KEY,name TEXT NOT NULL,username TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tickets(id TEXT PRIMARY KEY,chat_id TEXT NOT NULL REFERENCES telegram_users(chat_id),name TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'Открыт',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS replies(id TEXT PRIMARY KEY,ticket_id TEXT NOT NULL REFERENCES tickets(id),admin_id TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS bot_state(chat_id TEXT PRIMARY KEY,payload TEXT NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,chat_id TEXT NOT NULL,payload TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'pending',dedupe TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS miniapp_sessions(token_hash TEXT PRIMARY KEY,telegram_id TEXT NOT NULL,profile TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_miniapp_expiry ON miniapp_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox(status,next_at);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
`);
  return db;
}
export function transaction(db, fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
