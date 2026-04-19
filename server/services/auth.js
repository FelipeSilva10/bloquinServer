import jwt from 'jsonwebtoken';

// Em produção: usar variável de ambiente forte
// Ex: JWT_SECRET=$(openssl rand -hex 32)
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRY = '8h'; // duração de uma jornada escolar

/**
 * Gera um token JWT para o usuário autenticado.
 * @param {{ id: string, username: string, role: string }} user
 */
export function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Middleware Express: valida o Bearer token e injeta req.user.
 * Retorna 401 se ausente ou inválido.
 */
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

/**
 * Middleware Express: exige role 'teacher'.
 * Deve ser usado após requireAuth.
 */
export function requireTeacher(req, res, next) {
  if (req.user?.role !== 'teacher') {
    return res.status(403).json({ error: 'Acesso restrito a professores.' });
  }
  next();
}
