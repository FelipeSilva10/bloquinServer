import PQueue from 'p-queue';
import { compile } from './compiler.js';
import { send } from './websocket.js';

// 8 compilações simultâneas — 15 alunos em ~2 rounds de ~20s = pior caso ~40s de espera
const queue = new PQueue({ concurrency: 8 });

/**
 * Mapa em memória com o estado de cada job.
 *
 * job = {
 *   jobId:     string,
 *   clientId:  string,
 *   status:    'pending' | 'compiling' | 'done' | 'error',
 *   position:  number,          // posição na fila (1-indexed), 0 quando compilando
 *   error:     string | null,
 *   createdAt: number,          // Date.now()
 *   finishedAt: number | null,
 * }
 */
const jobs = new Map();

// Limpeza automática: remove jobs concluídos após 10 minutos
const BINARY_TTL_MS = 10 * 60 * 1000;

/**
 * Enfileira uma nova compilação.
 *
 * @param {string} jobId
 * @param {string} clientId  - identificador do cliente WebSocket
 * @param {string} code      - código C++ a compilar
 * @returns {{ jobId: string, position: number }}
 */
export function enqueue(jobId, clientId, code) {
  // Rate limit: um job ativo por cliente
  const activeJob = [...jobs.values()].find(
    (j) => j.clientId === clientId && (j.status === 'pending' || j.status === 'compiling')
  );
  if (activeJob) {
    const err = new Error('Já existe uma compilação em andamento para este cliente.');
    err.code = 'RATE_LIMITED';
    err.jobId = activeJob.jobId;
    throw err;
  }

  const position = queue.size + 1; // jobs aguardando + este

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

  // Notifica o cliente que o job foi enfileirado
  send(clientId, { type: 'queued', jobId, position });
  console.log(`[Fila] Job ${jobId} enfileirado. Posição: ${position}. Fila: ${queue.size}`);

  // Adiciona à fila p-queue
  queue.add(() => runJob(jobId, code));

  return { jobId, position };
}

/**
 * Retorna o estado atual de um job, ou null se não existir.
 * @param {string} jobId
 */
export function getJobStatus(jobId) {
  return jobs.get(jobId) ?? null;
}

// ---------------------------------------------------------------------------
// Interno
// ---------------------------------------------------------------------------

async function runJob(jobId, code) {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = 'compiling';
  job.position = 0;

  send(job.clientId, { type: 'compiling', jobId });
  console.log(`[Fila] Iniciando compilação do job ${jobId}`);

  try {
    const result = await compile(jobId, code);

    job.status = 'done';
    job.finishedAt = Date.now();

    send(job.clientId, { type: 'done', jobId });
    console.log(`[Fila] Job ${jobId} concluído com sucesso.`);

    // Agendar limpeza do job do mapa após TTL
    setTimeout(() => {
      jobs.delete(jobId);
      console.log(`[Fila] Job ${jobId} removido do mapa (TTL expirado).`);
    }, BINARY_TTL_MS);

    // Atualizar posições dos jobs ainda pendentes
    refreshPositions();

    return result;
  } catch (err) {
    job.status = 'error';
    job.error = err.message;
    job.finishedAt = Date.now();

    send(job.clientId, {
      type: 'error',
      jobId,
      message: err.message,
      stderr: err.stderr ?? '',
    });
    console.error(`[Fila] Job ${jobId} falhou:`, err.message);

    refreshPositions();
  }
}

/**
 * Recalcula e notifica as posições dos jobs ainda pendentes.
 * Chamado após cada job finalizar para manter o feedback preciso.
 */
function refreshPositions() {
  const pending = [...jobs.values()].filter((j) => j.status === 'pending');
  pending.forEach((job, idx) => {
    job.position = idx + 1;
    send(job.clientId, { type: 'queued', jobId: job.jobId, position: job.position });
  });
}
