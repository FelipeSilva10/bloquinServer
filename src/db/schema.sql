-- Usuários do sistema
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  username   TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'student',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Projetos de cada aluno/professor
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  blocks_xml  TEXT NOT NULL DEFAULT '',
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);

-- FIX #2: ownership de jobs de compilação, persistido para validação pós-TTL do mapa.
-- TTL sugerido: 24h (limpeza via cron ou no startup).
CREATE TABLE IF NOT EXISTS job_ownership (
  job_id     TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Limpa registros de ownership com mais de 24h (jobs expirados)
-- Execute periodicamente ou adicione ao startup:
-- DELETE FROM job_ownership WHERE created_at < unixepoch() - 86400;
