import PQueue from 'p-queue';
import { compile } from './compiler.js';
import { send } from './websocket.js';
import { run as dbRun } from '../db/index.js';

// 8 compilações simultâneas
const queue = new PQueue({ concurrency: 8 });

/**
 * Mapa em memória com estado de cada job.
 */
const jobs = new Map();

const BINARY_TTL_MS = 10 * 60 * 1000; // 10 minutos

/**
 * Enfileira uma nova compilação.
 *
 * FIX #6: position = queue.size (pendentes) + queue.pending (em execução) + 1
 *         Antes só usava queue.size, reportando posição 1 para os primeiros 8 jobs.
 *
 * FIX #2: ownership registrado no banco imediatamente ao enfileirar,
 *         antes do TTL do mapa em memória expirar.
 */
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

  // FIX #6: considera pendentes + em execução
  const position = queue.size + queue.pending + 1;

  const job = {
    jobId,
    clientId,
    status: 'pending',
    position,
    error: null,
    createdAt: Date.now(),
    finishedAt: null,
  };
  jobs.set(jobId, job);

  // FIX #2: persistir ownership no banco para validação pós-TTL do mapa
  try {
    const now = Math.floor(Date.now() / 1000);
    dbRun(
      `INSERT OR IGNORE INTO job_ownership (job_id, user_id, created_at)
       VALUES (?, ?, ?)`,
      [jobId, clientId, now]
    );
  } catch {
    // tabela pode não existir em instâncias antigas — operação não-crítica
  }

  send(clientId, { type: 'queued', jobId, position });
  console.log(`[Fila] Job ${jobId} enfileirado. Posição: ${position}. Fila: ${queue.size} Executando: ${queue.pending}`);

  queue.add(() => runJob(jobId, code));

  return { jobId, position };
}

export function getJobStatus(jobId) {
  return jobs.get(jobId) ?? null;
}

/**
 * FIX #2: verifica ownership mesmo após o job sair do mapa em memória.
 * Consulta o banco como fallback.
 */
export async function getJobOwnerAsync(jobId) {
  const inMemory = jobs.get(jobId);
  if (inMemory) return inMemory.clientId;

  try {
    const { get } = await import('../db/index.js');
    const row = get('SELECT user_id FROM job_ownership WHERE job_id = ?', [jobId]);
    return row?.user_id ?? null;
  } catch {
    return null;
  }
}

// ── Interno ──────────────────────────────────────────────────────────────────

async function runJob(jobId, code) {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status   = 'compiling';
  job.position = 0;

  send(job.clientId, { type: 'compiling', jobId });
  console.log(`[Fila] Iniciando compilação do job ${jobId}`);

  try {
    const result = await compile(jobId, code);

    job.status     = 'done';
    job.finishedAt = Date.now();

    send(job.clientId, { type: 'done', jobId });
    console.log(`[Fila] Job ${jobId} concluído.`);

    setTimeout(() => {
      jobs.delete(jobId);
      // Nota: job_ownership é mantido no banco para validação de download
      console.log(`[Fila] Job ${jobId} removido do mapa (TTL expirado).`);
    }, BINARY_TTL_MS);

    refreshPositions();
    return result;
  } catch (err) {
    job.status     = 'error';
    job.error      = err.message;
    job.finishedAt = Date.now();

    send(job.clientId, { type: 'error', jobId, message: err.message, stderr: err.stderr ?? '' });
    console.error(`[Fila] Job ${jobId} falhou:`, err.message);

    jobs.delete(jobId); // limpa imediatamente em caso de erro
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
