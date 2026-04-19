/**
 * services/wsClient.ts
 *
 * FIX #3: token JWT enviado como primeira mensagem WebSocket, não mais na
 * query string da URL (que aparece em logs de acesso de servidores e proxies).
 *
 * Protocolo de handshake:
 *   1. Cliente abre ws://host/ws  (sem token na URL)
 *   2. Assim que 'open' dispara, envia: { type: 'auth', token: '<JWT>' }
 *   3. Servidor responde: { type: 'connected', userId }
 *   4. A partir daí, eventos normais de job fluem normalmente.
 */

import { getToken } from './api';

type WsHandler = (event: WsEvent) => void;

export interface WsEvent {
  type: 'connected' | 'queued' | 'compiling' | 'done' | 'error';
  jobId?:    string;
  position?: number;
  message?:  string;
  stderr?:   string;
}

class BloquinWsClient {
  private ws:             WebSocket | null = null;
  private handlers =      new Map<string, WsHandler>();
  private reconnectDelay = 1000;
  private maxDelay =       16_000;
  private active =         false;
  private currentJobId:   string | null = null;

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

    // FIX #3: URL sem token — apenas o path base
    const wsBase = window.location.origin.replace(/^http/, 'ws');
    this.ws = new WebSocket(`${wsBase}/ws`);

    this.ws.addEventListener('open', () => {
      console.log('[WS] Conectado — enviando auth');
      this.reconnectDelay = 1000;

      // FIX #3: token enviado como primeira mensagem, não na URL
      this.ws!.send(JSON.stringify({ type: 'auth', token }));
    });

    this.ws.addEventListener('message', ({ data }) => {
      try {
        const event: WsEvent & { type: string } = JSON.parse(data);

        if (event.type === 'connected') {
          console.log('[WS] Autenticado');
          // Resync se havia job em andamento quando reconectou
          if (this.currentJobId) this._syncJob(this.currentJobId);
          return;
        }

        if (event.jobId) {
          this.handlers.get(event.jobId)?.(event as WsEvent);
        }
      } catch { /* ignorar */ }
    });

    this.ws.addEventListener('close', (e) => {
      if (!this.active) return;
      // Código 4001 = servidor fechou por nova sessão em outra aba — não reconectar
      if (e.code === 4001) {
        console.warn('[WS] Sessão substituída por nova aba — reconexão cancelada.');
        return;
      }
      console.log(`[WS] Reconectando em ${this.reconnectDelay}ms`);
      setTimeout(() => this._open(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
    });
  }

  onJob(jobId: string, handler: WsHandler) {
    this.currentJobId = jobId;
    this.handlers.set(jobId, handler);
  }

  offJob(jobId: string) {
    this.handlers.delete(jobId);
    if (this.currentJobId === jobId) this.currentJobId = null;
  }

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
