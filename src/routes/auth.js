import { Router } from 'express';
import bcrypt from 'bcrypt';
import { get } from '../db/index.js';
import { signToken, requireAuth } from '../services/auth.js';

export const authRouter = Router();

/**
 * POST /api/auth/login
 * Body: { username: string, password: string }
 * Resposta: { token: string, user: { id, name, role } }
 */
authRouter.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'username e password são obrigatórios.' });
  }

  const user = get(
    'SELECT id, username, password, name, role FROM users WHERE username = ?',
    [username.trim().toLowerCase()]
  );

  if (!user) {
    // Mesmo tempo de resposta independente de o usuário existir (evita timing attack)
    await bcrypt.compare(password, '$2b$10$invalidhashtopreventtimingattack000000000000');
    return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
  }

  const token = signToken(user);

  return res.json({
    token,
    user: { id: user.id, name: user.name, role: user.role },
  });
});

/**
 * POST /api/auth/logout
 * Apenas confirma logout (token é stateless — invalidação real fica para Marco futuro)
 */
authRouter.post('/auth/logout', requireAuth, (_req, res) => {
  res.json({ ok: true });
});

/**
 * GET /api/auth/me
 * Retorna os dados do usuário autenticado — útil para o cliente validar sessão ao recarregar.
 */
authRouter.get('/auth/me', requireAuth, (req, res) => {
  const user = get(
    'SELECT id, name, role FROM users WHERE id = ?',
    [req.user.id]
  );

  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  return res.json({ user: { id: user.id, name: user.name, role: user.role } });
});
