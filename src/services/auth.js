import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.error('[SEGURANÇA] JWT_SECRET não definido no .env — servidor recusando inicialização.');
  process.exit(1);
})();

export const JWT_EXPIRY = '8h';

/**
 * Hash dummy pré-computado para nivelar tempo de resposta no login.
 * Gerado uma vez na inicialização; evita timing attack sem custo em cada request.
 * FIX #5: o hash inválido anterior ('$2b$10$invalid...') era rejeitado pelo bcrypt
 * antes do processamento completo, vazando timing.
 */
let _dummyHash = null;
async function getDummyHash() {
  if (!_dummyHash) _dummyHash = await bcrypt.hash('__bloquin_timing_dummy__', 10);
  return _dummyHash;
}
// Aquece o hash no startup para que o primeiro login não seja mais lento
getDummyHash().catch(() => {});

export { getDummyHash };

// ── Rate limit de login (FIX #4) ─────────────────────────────────────────────
// Mapa: ip → { count, resetAt }
const _loginAttempts = new Map();
const LOGIN_WINDOW_MS  = 60_000; // 1 minuto
const LOGIN_MAX_TRIES  = 10;     // 10 tentativas por janela por IP

export function checkLoginRateLimit(ip) {
  const now  = Date.now();
  const entry = _loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    _loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true; // permitido
  }

  entry.count++;
  if (entry.count > LOGIN_MAX_TRIES) return false; // bloqueado
  return true;
}

// Limpeza periódica para não acumular IPs antigos
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of _loginAttempts) {
    if (now > entry.resetAt) _loginAttempts.delete(ip);
  }
}, LOGIN_WINDOW_MS);

// ── JWT ───────────────────────────────────────────────────────────────────────

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação necessário.' });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, username: payload.username, role: payload.role };
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Sessão expirada. Faça login novamente.'
      : 'Token inválido.';
    return res.status(401).json({ error: message });
  }
}

export function requireTeacher(req, res, next) {
  if (req.user?.role !== 'teacher') {
    return res.status(403).json({ error: 'Acesso restrito a professores.' });
  }
  next();
}
