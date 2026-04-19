import { Router } from 'express';
import { createReadStream, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { enqueue, getJobStatus, getJobOwnerAsync } from '../services/queue.js';
import { requireAuth } from '../services/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BINARIES_DIR = path.resolve(__dirname, '../../data/binaries');

export const compileRouter = Router();

compileRouter.use(requireAuth);

compileRouter.post('/compile', (req, res) => {
  const { code } = req.body;
  const clientId = req.user.id;

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

compileRouter.get('/binary/:jobId', async (req, res) => {
  const { jobId } = req.params;

  if (!/^[0-9a-f-]{36}$/.test(jobId)) {
    return res.status(400).json({ error: 'jobId inválido.' });
  }

  const filePath = path.join(BINARIES_DIR, `${jobId}.bin`);

  if (!existsSync(filePath)) {
    return res.status(404).json({ error: 'Binário não encontrado ou expirado.' });
  }

  // Verifica ownership — primeiro na memória, depois no banco
  const job = getJobStatus(jobId);
  if (job) {
    if (job.clientId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }
  } else {
    const ownerId = await getJobOwnerAsync(jobId);
    if (ownerId && ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }
  }

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${jobId}.bin"`);
  createReadStream(filePath).pipe(res);
});