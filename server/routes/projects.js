import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { run, get, all } from '../db/index.js';
import { requireAuth } from '../services/auth.js';

export const projectsRouter = Router();

// Todas as rotas exigem autenticação
projectsRouter.use(requireAuth);

/**
 * GET /api/projects
 * Lista todos os projetos do usuário autenticado.
 */
projectsRouter.get('/projects', (req, res) => {
  const projects = all(
    'SELECT id, name, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
    [req.user.id]
  );
  res.json({ projects });
});

/**
 * GET /api/projects/:id
 * Retorna um projeto completo (inclui blocks_xml).
 */
projectsRouter.get('/projects/:id', (req, res) => {
const project = get(
  'SELECT id, name, blocks_xml, target_board, updated_at FROM projects WHERE id = ? AND user_id = ?',
  [req.params.id, req.user.id]
);

  if (!project) {
    return res.status(404).json({ error: 'Projeto não encontrado.' });
  }

  res.json({ project });
});

/**
 * POST /api/projects
 * Body: { name: string, blocks_xml?: string }
 * Cria um novo projeto.
 */
projectsRouter.post('/projects', (req, res) => {
  const { name, blocks_xml = '', target_board = 'esp32' } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Campo "name" é obrigatório.' });
  }

  const id  = uuidv4();
  const now = Math.floor(Date.now() / 1000);

  run(
    'INSERT INTO projects (id, user_id, name, blocks_xml, target_board, updated_at) VALUES (?,?,?,?,?,?)',
    [id, req.user.id, name.trim(), blocks_xml, target_board, now]
  );

  const project = get(
    'SELECT id, name, target_board, updated_at FROM projects WHERE id = ?',
    [id]
  );
  res.status(201).json({ project });
});

/**
 * PUT /api/projects/:id
 * Body: { name?: string, blocks_xml?: string }
 * Atualiza nome e/ou estado do workspace.
 */
projectsRouter.put('/projects/:id', (req, res) => {
  const existing = get(
    'SELECT id FROM projects WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (!existing) {
    return res.status(404).json({ error: 'Projeto não encontrado.' });
  }

const { name, blocks_xml, target_board } = req.body;
const now = Math.floor(Date.now() / 1000);

const fields = [];
const values = [];

if (name !== undefined)         { fields.push('name = ?');         values.push(name.trim()); }
if (blocks_xml !== undefined)   { fields.push('blocks_xml = ?');   values.push(blocks_xml); }
if (target_board !== undefined) { fields.push('target_board = ?'); values.push(target_board); }

if (fields.length > 0) {
  fields.push('updated_at = ?');
  values.push(now, req.params.id);
  run(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, values);
}

const project = get(
  'SELECT id, name, target_board, updated_at FROM projects WHERE id = ?',
  [req.params.id]
);
res.json({ project });

/**
 * DELETE /api/projects/:id
 * Remove o projeto (apenas o dono pode apagar).
 */
projectsRouter.delete('/projects/:id', (req, res) => {
  const existing = get(
    'SELECT id FROM projects WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (!existing) {
    return res.status(404).json({ error: 'Projeto não encontrado.' });
  }

  run('DELETE FROM projects WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});
