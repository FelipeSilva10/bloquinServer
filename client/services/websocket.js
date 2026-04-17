/**
 * services/websocket.js
 * Cliente WebSocket com:
 *  - autenticação via JWT no handshake (?token=...)
 *  - reconexão automática com backoff exponencial
 *  - roteamento de eventos por jobId
 *  - fallback para polling em GET /api/compile/:jobId/status
 */

import api from './api.js';

class BloquinWS {
  constructor() {
    this._ws = null;
    this._handlers = new Map();  // jobId → callback
    this._globalHandlers = [];
    this._reconnectDelay = 1000;
    this._maxDelay = 16000;
    this._shouldConnect = false;
    this._currentJobId = null;
  }

  connect() {
    this._shouldConnect = true;
    this._open();
  }

  disconnect() {
    this._shouldConnect = false;
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
  }

  _open() {
    const token = api.getToken();
    if (!token) return;

    const wsBase = window.location.origin.replace(/^http/, 'ws');
    this._ws = new WebSocket(`${wsBase}/ws?token=${encodeURIComponent(token)}`);

    this._ws.addEventListener('open', () => {
      console.log('[WS] Conectado.');
      this._reconnectDelay = 1000;

      // Se havia um job em andamento, sincronizar estado
      if (this._currentJobId) {
        this._syncJobStatus(this._currentJobId);
      }
    });

    this._ws.addEventListener('message', (e) => {
      try {
        const event = JSON.parse(e.data);
        this._dispatch(event);
      } catch { /* ignorar mensagens malformadas */ }
    });

    this._ws.addEventListener('close', () => {
      console.log(`[WS] Desconectado. Reconectando em ${this._reconnectDelay}ms...`);
      if (this._shouldConnect) {
        setTimeout(() => this._open(), this._reconnectDelay);
        this._reconnectDelay = Math.min(this._reconnectDelay * 2, this._maxDelay);
      }
    });

    this._ws.addEventListener('error', () => {
      // O evento 'close' já cuida da reconexão
    });
  }

  // Registra callback para eventos de um job específico
  onJob(jobId, callback) {
    this._currentJobId = jobId;
    this._handlers.set(jobId, callback);
  }

  // Remove callback de um job (ao concluir)
  offJob(jobId) {
    this._handlers.delete(jobId);
    if (this._currentJobId === jobId) this._currentJobId = null;
  }

  _dispatch(event) {
    const handler = event.jobId && this._handlers.get(event.jobId);
    if (handler) handler(event);
  }

  // Polling de fallback após reconexão
  async _syncJobStatus(jobId) {
    try {
      const { status, position } = await api.jobStatus(jobId);
      const handler = this._handlers.get(jobId);
      if (!handler) return;

      if (status === 'done')      handler({ type: 'done',      jobId });
      else if (status === 'error') handler({ type: 'error',     jobId, message: 'Erro durante reconexão.' });
      else if (status === 'pending') handler({ type: 'queued', jobId, position });
      else if (status === 'compiling') handler({ type: 'compiling', jobId });
    } catch { /* job expirou */ }
  }
}

export const ws = new BloquinWS();
window.blqWS = ws;
export default ws;
