import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.resolve(__dirname, '../../data/bloquin.db');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function all(sql, params = []) {
  return db.prepare(sql).all(params);
}

export function get(sql, params = []) {
  return db.prepare(sql).get(params);
}

export function run(sql, params = []) {
  return db.prepare(sql).run(params);
}

export default db;
