/**
 * cleanup-jobs.js — Remove registros expirados de job_ownership.
 *
 * Execute periodicamente (ex: cron diário) ou no startup do servidor.
 * Uso: node scripts/cleanup-jobs.js
 */

import { run, all } from '../src/db/index.js';

const TTL_HOURS = 24;
const cutoff = Math.floor(Date.now() / 1000) - TTL_HOURS * 3600;

const before = all('SELECT COUNT(*) as n FROM job_ownership').at(0)?.n ?? 0;
run('DELETE FROM job_ownership WHERE created_at < ?', [cutoff]);
const after = all('SELECT COUNT(*) as n FROM job_ownership').at(0)?.n ?? 0;

console.log(`job_ownership: ${before} → ${after} registros (${before - after} removidos).`);
