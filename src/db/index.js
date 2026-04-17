/**
 * db/index.js — Camada de acesso ao SQLite.
 *
 * Em desenvolvimento (sandbox): usa node:sqlite (built-in Node 22).
 * Em produção (Arch Linux): substituir as três linhas marcadas com [PROD]
 * por: import Database from 'better-sqlite3'; const db = new Database(DB_PATH);
 *
 * A API usada aqui (exec, prepare, run, get, all) é compatível com ambos.
 */

import { readFileSync } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR    = path.resolve(__dirname, '../../data');
const DB_PATH   = path.join(DB_DIR, 'bloquin.db');
const SCHEMA    = readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');

// [PROD] Substituir este bloco por: import Database from 'better-sqlite3';
import { DatabaseSync } from 'node:sqlite';
const DB = DatabaseSync; // alias para facilitar troca futura

// Garante que o diretório /data existe antes de abrir o arquivo
await mkdir(DB_DIR, { recursive: true });

// [PROD] const db = new Database(DB_PATH);
const db = new DB(DB_PATH);

// Aplica o schema (CREATE TABLE IF NOT EXISTS — idempotente)
db.exec(SCHEMA);

/**
 * Wrapper fino para normalizar a API de parâmetros nomeados.
 *
 * node:sqlite usa posicionais por padrão; better-sqlite3 aceita objeto.
 * Exportamos funções utilitárias ao invés de expor o db diretamente.
 */

export function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}

export function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}

export function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}

export { db };
