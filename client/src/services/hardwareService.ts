/**
 * hardwareService.ts — Marco 5 completo
 *
 * Substitui as chamadas Tauri (invoke/listen) pelas equivalentes web:
 *   invoke('upload_code')        → POST /api/compile  +  eventos WS
 *   invoke('start_serial')       → Web Serial (serialService.startMonitor)
 *   invoke('stop_serial')        → Web Serial (serialService.stopMonitor)
 *   listen('upload-result')      → CustomEvent 'blq:upload-result'
 *   listen('serial-message')     → CustomEvent 'blq:serial-message'
 */

import { getToken } from './api';
import { blqWs, type WsEvent } from './wsClient';
import { startMonitor, stopMonitor } from './serialService';

export type UnlistenFn = () => void;

export const HardwareService = {

  // ── Portas ────────────────────────────────────────────────────────────────
  // Web Serial não lista portas antes de gesto do usuário.
  // Retorna placeholder informativo para manter o dropdown funcional.
  async getAvailablePorts(): Promise<string[]> {
    if (!('serial' in navigator)) {
      return ['(Web Serial indisponível neste navegador)'];
    }
    return ['(ESP32 — clique Compilar, depois Gravar)'];
  },

  // ── Compilação ────────────────────────────────────────────────────────────
  async uploadCode(codigo: string, _placa: string, _porta: string): Promise<void> {
    const token = getToken();

    const res = await fetch('/api/compile', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ code: codigo }),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Erro desconhecido' })) as { error: string };
      window.dispatchEvent(new CustomEvent('blq:upload-result', { detail: `err:${error}` }));
      return;
    }

    const { jobId } = await res.json() as { jobId: string; position: number };

    // Guarda para uso posterior no FlashModal
    sessionStorage.setItem('blq_last_job', jobId);

    // Registra handler para eventos WS deste job
    blqWs.onJob(jobId, (event: WsEvent) => {
      switch (event.type) {
        case 'done':
          window.dispatchEvent(new CustomEvent('blq:upload-result', { detail: 'ok' }));
          blqWs.offJob(jobId);
          break;
        case 'error':
          window.dispatchEvent(new CustomEvent('blq:upload-result', {
            detail: `err:${event.message ?? 'Erro na compilação'}`,
          }));
          blqWs.offJob(jobId);
          break;
        case 'queued':
          window.dispatchEvent(new CustomEvent('blq:compile-queued', { detail: event.position }));
          break;
        case 'compiling':
          window.dispatchEvent(new CustomEvent('blq:compile-started'));
          break;
      }
    });
  },

  // ── Serial Monitor ────────────────────────────────────────────────────────
  async startSerial(_porta: string): Promise<void> {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API não disponível. Use Chrome 89+ ou Edge 89+.');
    }
    await startMonitor(115200, (line: string) => {
      window.dispatchEvent(new CustomEvent('blq:serial-message', { detail: line }));
    });
  },

  async stopSerial(): Promise<void> {
    await stopMonitor();
  },

  // ── Listeners (compatibilidade com IdeScreen) ─────────────────────────────
  async listenUploadResult(callback: (payload: string) => void): Promise<UnlistenFn> {
    const handler = (e: Event) => callback((e as CustomEvent<string>).detail);
    window.addEventListener('blq:upload-result', handler);
    return () => window.removeEventListener('blq:upload-result', handler);
  },

  async listenSerialMessages(callback: (payload: string) => void): Promise<UnlistenFn> {
    const handler = (e: Event) => callback((e as CustomEvent<string>).detail);
    window.addEventListener('blq:serial-message', handler);
    return () => window.removeEventListener('blq:serial-message', handler);
  },

  async listenCompileQueued(callback: (position: number) => void): Promise<UnlistenFn> {
    const handler = (e: Event) => callback((e as CustomEvent<number>).detail);
    window.addEventListener('blq:compile-queued', handler);
    return () => window.removeEventListener('blq:compile-queued', handler);
  },

  async listenCompileStarted(callback: () => void): Promise<UnlistenFn> {
    const handler = () => callback();
    window.addEventListener('blq:compile-started', handler);
    return () => window.removeEventListener('blq:compile-started', handler);
  },
};
