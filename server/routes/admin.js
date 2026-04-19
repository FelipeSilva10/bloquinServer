import { Router } from 'express';
import { requireAuth, requireTeacher } from '../services/auth.js';
import { all, get } from '../db/index.js';
import { getConnectedUsers } from '../services/websocket.js';
import { getQueueSnapshot } from '../services/queue.js';

export const adminRouter = Router();

// Todas as rotas exigem professor
adminRouter.use(requireAuth, requireTeacher);

/**
 * GET /api/admin/stats
 * Resumo geral: uptime, fila, conexões.
 */
adminRouter.get('/admin/stats', (_req, res) => {
  const connected = getConnectedUsers();
  const queue     = getQueueSnapshot();

  res.json({
    uptime:        process.uptime(),
    connectedCount: connected.length,
    connectedIds:   connected,
    queue: {
      compiling: queue.pending,
      waiting:   queue.queued,
      jobs:      queue.jobs,
    },
  });
});

/**
 * GET /api/admin/users
 * Lista todos os usuários com status online/offline.
 */
adminRouter.get('/admin/users', (_req, res) => {
  const users    = all('SELECT id, username, name, role, created_at FROM users ORDER BY role, name');
  const online   = new Set(getConnectedUsers());
  const jobSnap  = getQueueSnapshot();

  const result = users.map(u => {
    const job = jobSnap.jobs.find(j => j.clientId === u.id);
    return {
      id:        u.id,
      username:  u.username,
      name:      u.name,
      role:      u.role,
      online:    online.has(u.id),
      compiling: job ? job.status : null,
    };
  });

  res.json({ users: result });
});

/**
 * GET /api/admin/projects
 * Todos os projetos de todos os alunos.
 */
adminRouter.get('/admin/projects', (_req, res) => {
  const projects = all(`
    SELECT p.id, p.name, p.updated_at, u.id as user_id, u.name as user_name, u.username
    FROM projects p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.updated_at DESC
  `);
  res.json({ projects });
});

/**
 * GET /api/admin/projects/:userId
 * Projetos de um aluno específico.
 */
adminRouter.get('/admin/projects/:userId', (req, res) => {
  const user = get('SELECT id, name, username FROM users WHERE id = ?', [req.params.userId]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const projects = all(
    'SELECT id, name, blocks_xml, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
    [req.params.userId]
  );

  res.json({ user, projects });
});
// Middleware — rejeita qualquer IP fora do localhost
function requireLocalhost(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress;
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  if (isLocal) return next();
  return res.status(403).json({ error: 'Acesso restrito ao servidor local.' });
}

// Rota sem autenticação — só responde para localhost
adminRouter.get('/admin/local-stats', requireLocalhost, (_req, res) => {
  const connected = getConnectedUsers();
  const queue     = getQueueSnapshot();
  const users     = all('SELECT id, role FROM users');

  const students        = users.filter(u => u.role === 'student');
  const onlineCount     = students.filter(u => connected.includes(u.id)).length;

  res.json({
    uptime:    process.uptime(),
    online:    onlineCount,
    total:     students.length,
    compiling: queue.pending,
    queued:    queue.queued,
  });
});
