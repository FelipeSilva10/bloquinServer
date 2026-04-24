import { Router } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, requireTeacher } from '../services/auth.js';
import { all, get, run } from '../db/index.js';
import { getConnectedUsers } from '../services/websocket.js';
import { getQueueSnapshot } from '../services/queue.js';

export const adminRouter = Router();

// ── Middleware: apenas localhost ──────────────────────────────────────────────
function requireLocalhost(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress;
  const isLocal =
    ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  if (isLocal) return next();
  return res.status(403).json({ error: 'Acesso restrito ao servidor local.' });
}

// ── Rotas autenticadas (professor) ────────────────────────────────────────────
// FIX: middleware passado diretamente no método de rota, não via router.use()

adminRouter.get('/admin/stats', requireAuth, requireTeacher, (_req, res) => {
  const connected = getConnectedUsers();
  const queue     = getQueueSnapshot();
  res.json({
    uptime:         process.uptime(),
    connectedCount: connected.length,
    connectedIds:   connected,
    queue: {
      compiling: queue.pending,
      waiting:   queue.queued,
      jobs:      queue.jobs,
    },
  });
});

adminRouter.get('/admin/users', requireAuth, requireTeacher, (_req, res) => {
  const users   = all('SELECT id, username, name, role, created_at FROM users ORDER BY role, name');
  const online  = new Set(getConnectedUsers());
  const jobSnap = getQueueSnapshot();

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

adminRouter.get('/admin/projects', requireAuth, requireTeacher, (_req, res) => {
  const projects = all(`
    SELECT p.id, p.name, p.updated_at, u.id as user_id, u.name as user_name, u.username
    FROM projects p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.updated_at DESC
  `);
  res.json({ projects });
});

// FIX: middleware explícito na rota /:userId — não depende mais de prefix implícito
adminRouter.get('/admin/projects/:userId', requireAuth, requireTeacher, (req, res) => {
  const user = get('SELECT id, name, username FROM users WHERE id = ?', [req.params.userId]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const projects = all(
    'SELECT id, name, blocks_xml, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
    [req.params.userId]
  );
  res.json({ user, projects });
});

// ── Rotas locais: gerenciamento pelo HUD (sem JWT) ────────────────────────────

adminRouter.get('/admin/local-stats', requireLocalhost, (_req, res) => {
  const connected = getConnectedUsers();
  const queue     = getQueueSnapshot();
  const users     = all('SELECT id, role FROM users');
  const students  = users.filter(u => u.role === 'student');

  res.json({
    uptime:    process.uptime(),
    online:    students.filter(u => connected.includes(u.id)).length,
    total:     students.length,
    compiling: queue.pending,
    queued:    queue.queued,
    projects:  all('SELECT COUNT(*) as n FROM projects')[0]?.n ?? 0,
  });
});

adminRouter.get('/admin/local/users', requireLocalhost, (_req, res) => {
  const users  = all('SELECT id, username, name, role, created_at FROM users ORDER BY role ASC, name ASC');
  const online = new Set(getConnectedUsers());
  res.json({
    users: users.map(u => ({ ...u, online: online.has(u.id) })),
  });
});

// FIX: try/catch em todos os handlers async para evitar UnhandledPromiseRejection
adminRouter.post('/admin/local/users', requireLocalhost, async (req, res) => {
  try {
    const { username, password, name, role = 'student' } = req.body ?? {};

    if (!username || typeof username !== 'string' || username.trim() === '')
      return res.status(400).json({ error: 'Campo "username" é obrigatório.' });
    if (!password || typeof password !== 'string' || password.length < 4)
      return res.status(400).json({ error: 'Senha deve ter ao menos 4 caracteres.' });
    if (!name || typeof name !== 'string' || name.trim() === '')
      return res.status(400).json({ error: 'Campo "name" é obrigatório.' });
    if (!['student', 'teacher'].includes(role))
      return res.status(400).json({ error: 'Role inválido. Use "student" ou "teacher".' });

    const existing = get('SELECT id FROM users WHERE username = ?', [username.trim().toLowerCase()]);
    if (existing)
      return res.status(409).json({ error: `Usuário "${username}" já existe.` });

    const id   = uuidv4();
    const hash = await bcrypt.hash(password, 10);

    run(
      'INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)',
      [id, username.trim().toLowerCase(), hash, name.trim(), role]
    );

    const user = get('SELECT id, username, name, role, created_at FROM users WHERE id = ?', [id]);
    return res.status(201).json({ user });
  } catch (err) {
    console.error('[POST /admin/local/users]', err);
    return res.status(500).json({ error: 'Erro interno ao criar usuário.' });
  }
});

adminRouter.put('/admin/local/users/:id', requireLocalhost, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, password, role } = req.body ?? {};

    const user = get('SELECT id, username FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const fields = [];
    const values = [];

    if (name !== undefined && name.trim() !== '') {
      fields.push('name = ?');
      values.push(name.trim());
    }
    if (role !== undefined && ['student', 'teacher'].includes(role)) {
      fields.push('role = ?');
      values.push(role);
    }
    if (password !== undefined && password.length >= 4) {
      const hash = await bcrypt.hash(password, 10);
      fields.push('password = ?');
      values.push(hash);
    }

    if (fields.length === 0)
      return res.status(400).json({ error: 'Nenhum campo válido para atualizar.' });

    values.push(id);
    run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

    const updated = get('SELECT id, username, name, role, created_at FROM users WHERE id = ?', [id]);
    return res.json({ user: updated });
  } catch (err) {
    console.error('[PUT /admin/local/users/:id]', err);
    return res.status(500).json({ error: 'Erro interno ao atualizar usuário.' });
  }
});

adminRouter.delete('/admin/local/users/:id', requireLocalhost, (req, res) => {
  const { id } = req.params;

  const user = get('SELECT id, username, role FROM users WHERE id = ?', [id]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  if (user.role === 'teacher') {
    const teacherCount = get('SELECT COUNT(*) as n FROM users WHERE role = "teacher"')?.n ?? 0;
    if (teacherCount <= 1)
      return res.status(409).json({ error: 'Não é possível remover o único professor.' });
  }

  run('DELETE FROM users WHERE id = ?', [id]);
  return res.json({ ok: true, removedUsername: user.username });
});