/**
 * services/api.ts
 * Cliente HTTP para a API local do Bloquin.
 * Substitui @supabase/supabase-js por chamadas fetch diretas.
 */

const BASE = '';  // mesmo origin — funciona em dev (proxy Vite) e produção

// ── Token ────────────────────────────────────────────────────────────────────

export function getToken(): string | null {
  return sessionStorage.getItem('blq_token');
}

export function getStoredUser(): { id: string; name: string; role: string } | null {
  try { return JSON.parse(sessionStorage.getItem('blq_user') ?? 'null'); }
  catch { return null; }
}

function setSession(token: string, user: object) {
  sessionStorage.setItem('blq_token', token);
  sessionStorage.setItem('blq_user', JSON.stringify(user));
}

export function clearSession() {
  sessionStorage.removeItem('blq_token');
  sessionStorage.removeItem('blq_user');
}

// ── Core fetch ────────────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<{ data: T | null; error: { message: string } | null }> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const json = await res.json().catch(() => ({})) as Record<string, unknown>;

    if (res.status === 401) {
      clearSession();
      window.dispatchEvent(new CustomEvent('blq:session-expired'));
      return { data: null, error: { message: 'Sessão expirada.' } };
    }

    if (!res.ok) {
      return { data: null, error: { message: String(json.error ?? 'Erro na requisição.') } };
    }

    return { data: json as T, error: null };
  } catch (err) {
    return { data: null, error: { message: String(err) } };
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const blqAuth = {
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    // O desktop usa email, o servidor aceita username — strip do domínio se necessário
    const username = email.includes('@') ? email.split('@')[0] : email;

    const { data, error } = await request<{ token: string; user: { id: string; name: string; role: string } }>(
      'POST', '/api/auth/login', { username, password }
    );

    if (error || !data) return { data: { user: null }, error };

    setSession(data.token, data.user);

    // Retorna no formato que o LoginScreen espera (compatível com Supabase)
    return {
      data: {
        user: { id: data.user.id, email: username },
      },
      error: null,
    };
  },

  async signOut() {
    await request('POST', '/api/auth/logout');
    clearSession();
    return { error: null };
  },

  getUser() {
    const user = getStoredUser();
    return Promise.resolve({
      data: { user: user ? { id: user.id } : null },
      error: null,
    });
  },

  getSession() {
    const token = getToken();
    return Promise.resolve({
      data: { session: token ? { access_token: token, refresh_token: '' } : null },
      error: null,
    });
  },
};

// ── Perfis ────────────────────────────────────────────────────────────────────
// Simula a tabela `perfis` do Supabase com os dados do JWT armazenado

export const blqPerfis = {
  async getRole(userId: string): Promise<string | null> {
    const user = getStoredUser();
    if (user?.id === userId) return user.role;
    return null;
  },
};

// ── Projetos ──────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  nome: string;
  target_board: string;
  workspace_data: string;
  updated_at: string;
}

export const blqProjects = {
  async list() {
    const { data, error } = await request<{ projects: Array<{ id: string; name: string; updated_at: number }> }>(
      'GET', '/api/projects'
    );
    if (error || !data) return { data: null, error };

    // Normalizar para o formato do desktop (nome em vez de name, timestamps como ISO)
    const projects = data.projects.map((p) => ({
      id: p.id,
      nome: p.name,
      updated_at: new Date(p.updated_at * 1000).toISOString(),
    }));
    return { data: projects, error: null };
  },

 async get(id: string) {
  const { data, error } = await request<{
    project: { id: string; name: string; blocks_xml: string; target_board: string; updated_at: number }
  }>('GET', `/api/projects/${id}`);

  if (error || !data) return { data: null, error };

  return {
    data: {
      id:             data.project.id,
      nome:           data.project.name,
      workspace_data: data.project.blocks_xml,
      target_board:   data.project.target_board,  // ← valor real do banco
      updated_at:     new Date(data.project.updated_at * 1000).toISOString(),
    },
    error: null,
  };
},

  async create(nome: string) {
    const { data, error } = await request<{ project: { id: string; name: string; updated_at: number } }>(
      'POST', '/api/projects', { name: nome }
    );
    if (error || !data) return { data: null, error };
    return {
      data: { id: data.project.id, nome: data.project.name, updated_at: new Date(data.project.updated_at * 1000).toISOString() },
      error: null,
    };
  },

async save(id: string, payload: { nome?: string; workspace_data?: string; target_board?: string }) {
  const body: Record<string, string> = {};
  if (payload.nome)           body.name         = payload.nome;
  if (payload.workspace_data) body.blocks_xml    = payload.workspace_data;
  if (payload.target_board)   body.target_board  = payload.target_board;  // ← linha que faltava
  const { error } = await request('PUT', `/api/projects/${id}`, body);
  return { error };
},

  async delete(id: string) {
    const { error } = await request('DELETE', `/api/projects/${id}`);
    return { error };
  },
};

// ── Binário ───────────────────────────────────────────────────────────────────

export async function downloadBinary(jobId: string): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`/api/binary/${jobId}`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Binário não encontrado ou expirado.');
  return res.blob();
}
