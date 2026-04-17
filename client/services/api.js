/**
 * services/api.js
 * Wrapper sobre fetch com autenticação JWT automática.
 * Token armazenado em sessionStorage (expira ao fechar o navegador).
 */

const BASE = '';  // mesmo origin — servidor serve frontend e API

export const api = {

  // ── Auth ──────────────────────────────────────────────────────────

  getToken() {
    return sessionStorage.getItem('blq_token');
  },

  setSession(token, user) {
    sessionStorage.setItem('blq_token', token);
    sessionStorage.setItem('blq_user', JSON.stringify(user));
  },

  clearSession() {
    sessionStorage.removeItem('blq_token');
    sessionStorage.removeItem('blq_user');
  },

  getUser() {
    try { return JSON.parse(sessionStorage.getItem('blq_user')); }
    catch { return null; }
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  // ── HTTP ──────────────────────────────────────────────────────────

  async request(method, path, body) {
    const token = this.getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    // Sessão expirada — redirecionar para login
    if (res.status === 401) {
      this.clearSession();
      window.dispatchEvent(new CustomEvent('blq:session-expired'));
      throw new Error('Sessão expirada.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || 'Erro na requisição.'), { status: res.status, data });
    return data;
  },

  get(path)          { return this.request('GET',    path); },
  post(path, body)   { return this.request('POST',   path, body); },
  put(path, body)    { return this.request('PUT',    path, body); },
  delete(path)       { return this.request('DELETE', path); },

  // ── Endpoints ────────────────────────────────────────────────────

  async login(username, password) {
    const data = await this.post('/api/auth/login', { username, password });
    this.setSession(data.token, data.user);
    return data.user;
  },

  async logout() {
    await this.post('/api/auth/logout').catch(() => {});
    this.clearSession();
  },

  // Projetos
  listProjects()          { return this.get('/api/projects'); },
  getProject(id)          { return this.get(`/api/projects/${id}`); },
  createProject(name)     { return this.post('/api/projects', { name, blocks_xml: '' }); },
  saveProject(id, data)   { return this.put(`/api/projects/${id}`, data); },
  deleteProject(id)       { return this.delete(`/api/projects/${id}`); },

  // Compilação
  compile(code)           { return this.post('/api/compile', { code }); },
  jobStatus(jobId)        { return this.get(`/api/compile/${jobId}/status`); },

  // Binário — retorna Blob direto
  async downloadBinary(jobId) {
    const token = this.getToken();
    const res = await fetch(`/api/binary/${jobId}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Binário não encontrado.');
    return res.blob();
  },
};

window.api = api;
export default api;
