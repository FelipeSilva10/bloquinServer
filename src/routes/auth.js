import { Router } from 'express';
import bcrypt from 'bcrypt';
import { get } from '../db/index.js';
import { signToken, requireAuth, getDummyHash, checkLoginRateLimit } from '../services/auth.js';

export const authRouter = Router();

/**
 * POST /api/auth/login
 *
 * FIX #4: Rate limit por IP — 10 tentativas/minuto.
 * FIX #5: Usa getDummyHash() para timing attack mitigation com hash válido.
 */
authRouter.post('/auth/login', async (req, res) => {
  // FIX #4 — rate limit
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkLoginRateLimit(ip)) {
    return res.status(429).json({ error: 'Muitas tentativas. Aguarde 1 minuto.' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'username e password são obrigatórios.' });
  }

  const user = get(
    'SELECT id, username, password, name, role FROM users WHERE username = ?',
    [username.trim().toLowerCase()]
  );

  if (!user) {
    // FIX #5: usa hash dummy válido para não vazar timing
    const dummy = await getDummyHash();
    await bcrypt.compare(password, dummy);
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

authRouter.post('/auth/logout', requireAuth, (_req, res) => {
  res.json({ ok: true });
});

authRouter.get('/auth/me', requireAuth, (req, res) => {
  const user = get(
    'SELECT id, name, role FROM users WHERE id = ?',
    [req.user.id]
  );

  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  return res.json({ user: { id: user.id, name: user.name, role: user.role } });
});
