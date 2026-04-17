import { Router } from 'express';
import { createReadStream, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { enqueue, getJobStatus } from '../services/queue.js';
import { requireAuth } from '../services/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BINARIES_DIR = path.resolve(__dirname, '../../data/binaries');

export const compileRouter = Router();

// Todas as rotas de compilação exigem autenticação
compileRouter.use(requireAuth);

/**
 * POST /api/compile
 * Body: { code: string }
 * Resposta imediata: { jobId, position }
 *
 * clientId agora é extraído do JWT (req.user.id) — não vem mais do body.
 * O WebSocket usa o mesmo userId como identificador de conexão.
 */
compileRouter.post('/compile', (req, res) => {
  const { code } = req.body;
  const clientId = req.user.id; // vem do JWT via requireAuth

  if (!code || typeof code !== 'string' || code.trim() === '') {
    return res.status(400).json({ error: 'Campo "code" é obrigatório.' });
  }

  const jobId = uuidv4();

  try {
    const { position } = enqueue(jobId, clientId, code);
    return res.status(202).json({ jobId, position });
  } catch (err) {
    if (err.code === 'RATE_LIMITED') {
      return res.status(429).json({
        error: 'Já existe uma compilação em andamento.',
        activeJobId: err.jobId,
      });
    }
    console.error('[POST /compile] Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro interno ao enfileirar job.' });
  }
});

/**
 * GET /api/compile/:jobId/status
 * Permite sincronizar estado do job após reconexão WebSocket.
 * Apenas o dono do job pode consultar.
 */
compileRouter.get('/compile/:jobId/status', (req, res) => {
  const { jobId } = req.params;

  if (!/^[0-9a-f-]{36}$/.test(jobId)) {
    return res.status(400).json({ error: 'jobId inválido.' });
  }

  const job = getJobStatus(jobId);

  if (!job) {
    const binaryExists = existsSync(path.join(BINARIES_DIR, `${jobId}.bin`));
    if (binaryExists) return res.json({ jobId, status: 'done' });
    return res.status(404).json({ error: 'Job não encontrado ou expirado.' });
  }

  // Garante que apenas o dono consulte o job
  if (job.clientId !== req.user.id) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  return res.json({
    jobId: job.jobId,
    status: job.status,
    position: job.position,
    error: job.error,
  });
});

/**
 * GET /api/binary/:jobId
 * Retorna o binário compilado. Apenas o dono pode baixar.
 */
compileRouter.get('/binary/:jobId', (req, res) => {
  const { jobId } = req.params;

  if (!/^[0-9a-f-]{36}$/.test(jobId)) {
    return res.status(400).json({ error: 'jobId inválido.' });
  }

  // Verifica ownership pelo mapa de jobs (ainda em memória)
  const job = getJobStatus(jobId);
  if (job && job.clientId !== req.user.id) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const filePath = path.join(BINARIES_DIR, `${jobId}.bin`);

  if (!existsSync(filePath)) {
    return res.status(404).json({ error: 'Binário não encontrado ou expirado.' });
  }

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${jobId}.bin"`);
  createReadStream(filePath).pipe(res);
});
