/**
 * services/wsClient.ts
 * Cliente WebSocket autenticado com reconexão automática.
 * Substitui os listeners Tauri (listen('upload-result'), etc.)
 */

import { getToken } from './api';

type WsHandler = (event: WsEvent) => void;

export interface WsEvent {
  type: 'connected' | 'queued' | 'compiling' | 'done' | 'error';
  jobId?: string;
  position?: number;
  message?: string;
  stderr?: string;
}

class BloquinWsClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, WsHandler>();  // jobId → handler
  private reconnectDelay = 1000;
  private maxDelay = 16_000;
  private active = false;
  private currentJobId: string | null = null;

  connect() {
    this.active = true;
    this._open();
  }

  disconnect() {
    this.active = false;
    this.ws?.close();
    this.ws = null;
  }

  private _open() {
    const token = getToken();
    if (!token || !this.active) return;

    const wsBase = window.location.origin.replace(/^http/, 'ws');
    this.ws = new WebSocket(`${wsBase}/ws?token=${encodeURIComponent(token)}`);

    this.ws.addEventListener('open', () => {
      console.log('[WS] Conectado');
      this.reconnectDelay = 1000;
      // Resync se havia job em andamento
      if (this.currentJobId) this._syncJob(this.currentJobId);
    });

    this.ws.addEventListener('message', ({ data }) => {
      try {
        const event: WsEvent = JSON.parse(data);
        if (event.jobId) {
          this.handlers.get(event.jobId)?.(event);
        }
      } catch { /* ignorar */ }
    });

    this.ws.addEventListener('close', () => {
      if (!this.active) return;
      console.log(`[WS] Reconectando em ${this.reconnectDelay}ms`);
      setTimeout(() => this._open(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
    });
  }

  /** Registra callback para eventos de um job específico */
  onJob(jobId: string, handler: WsHandler) {
    this.currentJobId = jobId;
    this.handlers.set(jobId, handler);
  }

  offJob(jobId: string) {
    this.handlers.delete(jobId);
    if (this.currentJobId === jobId) this.currentJobId = null;
  }

  /** Polling de status após reconexão WS */
  private async _syncJob(jobId: string) {
    try {
      const token = getToken();
      const res = await fetch(`/api/compile/${jobId}/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const { status, position } = await res.json() as { status: string; position?: number };
      const handler = this.handlers.get(jobId);
      if (!handler) return;

      if      (status === 'done')      handler({ type: 'done', jobId });
      else if (status === 'error')     handler({ type: 'error', jobId, message: 'Erro (reconexão)' });
      else if (status === 'pending')   handler({ type: 'queued', jobId, position });
      else if (status === 'compiling') handler({ type: 'compiling', jobId });
    } catch { /* job expirou */ }
  }
}

export const blqWs = new BloquinWsClient();
