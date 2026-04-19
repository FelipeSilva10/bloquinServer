import PQueue from 'p-queue';
import { compile } from './compiler.js';
import { send } from './websocket.js';
import { run as dbRun } from '../db/index.js';

const queue = new PQueue({ concurrency: 8 });
const jobs  = new Map();
const BINARY_TTL_MS = 10 * 60 * 1000;

export function enqueue(jobId, clientId, code) {
  const activeJob = [...jobs.values()].find(
    (j) => j.clientId === clientId && (j.status === 'pending' || j.status === 'compiling')
  );
  if (activeJob) {
    const err = new Error('Já existe uma compilação em andamento para este cliente.');
    err.code  = 'RATE_LIMITED';
    err.jobId = activeJob.jobId;
    throw err;
  }

  const position = queue.size + queue.pending + 1;

  const job = {
    jobId, clientId, status: 'pending', position,
    error: null, createdAt: Date.now(), finishedAt: null,
  };
  jobs.set(jobId, job);

  try {
    const now = Math.floor(Date.now() / 1000);
    dbRun(
      `INSERT OR IGNORE INTO job_ownership (job_id, user_id, created_at) VALUES (?, ?, ?)`,
      [jobId, clientId, now]
    );
  } catch { /* tabela pode não existir em instâncias antigas */ }

  send(clientId, { type: 'queued', jobId, position });
  console.log(`[Fila] Job ${jobId} enfileirado. Posição: ${position}.`);

  queue.add(() => runJob(jobId, code));
  return { jobId, position };
}

export function getJobStatus(jobId) {
  return jobs.get(jobId) ?? null;
}

export async function getJobOwnerAsync(jobId) {
  const inMemory = jobs.get(jobId);
  if (inMemory) return inMemory.clientId;
  try {
    const { get } = await import('../db/index.js');
    const row = get('SELECT user_id FROM job_ownership WHERE job_id = ?', [jobId]);
    return row?.user_id ?? null;
  } catch { return null; }
}

/** Snapshot do estado atual da fila para o painel admin */
export function getQueueSnapshot() {
  return {
    concurrency: queue.concurrency,
    pending:     queue.pending,
    queued:      queue.size,
    jobs: [...jobs.values()].map(j => ({
      jobId:     j.jobId,
      clientId:  j.clientId,
      status:    j.status,
      position:  j.position,
      createdAt: j.createdAt,
    })),
  };
}

async function runJob(jobId, code) {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status   = 'compiling';
  job.position = 0;
  send(job.clientId, { type: 'compiling', jobId });
  console.log(`[Fila] Compilando job ${jobId}`);

  try {
    const result = await compile(jobId, code);
    job.status     = 'done';
    job.finishedAt = Date.now();
    send(job.clientId, { type: 'done', jobId });
    console.log(`[Fila] Job ${jobId} concluído.`);
    setTimeout(() => { jobs.delete(jobId); }, BINARY_TTL_MS);
    refreshPositions();
    return result;
  } catch (err) {
    job.status     = 'error';
    job.error      = err.message;
    job.finishedAt = Date.now();
    send(job.clientId, { type: 'error', jobId, message: err.message, stderr: err.stderr ?? '' });
    console.error(`[Fila] Job ${jobId} falhou:`, err.message);
    jobs.delete(jobId);
    refreshPositions();
  }
}

function refreshPositions() {
  const pending = [...jobs.values()].filter((j) => j.status === 'pending');
  pending.forEach((job, idx) => {
    job.position = idx + 1;
    send(job.clientId, { type: 'queued', jobId: job.jobId, position: job.position });
  });
}
