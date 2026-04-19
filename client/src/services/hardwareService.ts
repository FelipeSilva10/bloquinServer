/**
 * hardwareService.ts
 *
 * FIX #8: uploadCode agora retorna Promise<string> com o jobId,
 * eliminando a dependência de sessionStorage.getItem('blq_last_job')
 * no FlashModal (que causava jobId stale após compilações consecutivas).
 */

import { getToken } from './api';
import { blqWs, type WsEvent } from './wsClient';
import { startMonitor, stopMonitor } from './serialService';

export type UnlistenFn = () => void;

export const HardwareService = {

  async getAvailablePorts(): Promise<string[]> {
    if (!('serial' in navigator)) {
      return ['(Web Serial indisponível neste navegador)'];
    }
    return ['(ESP32 — clique Compilar, depois Gravar)'];
  },

  /**
   * FIX #8: retorna o jobId em vez de armazená-lo no sessionStorage.
   * O chamador (IdeScreen) mantém o jobId em estado React e passa ao FlashModal.
   *
   * @returns Promise<string> jobId da compilação enfileirada
   */
  async uploadCode(codigo: string, _placa: string, _porta: string): Promise<string> {
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
      throw new Error(error);
    }

    const { jobId } = await res.json() as { jobId: string; position: number };

    // FIX #8: jobId retornado — não salvar mais em sessionStorage
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

    return jobId;
  },

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
