/**
 * hardwareService.ts
 *
 * FIX Chromebook: usa isWebSerialSupported() de serialService
 * para dar feedback correto sobre disponibilidade de Web Serial.
 */

import { getToken } from './api';
import { blqWs, type WsEvent } from './wsClient';
import { startMonitor, stopMonitor, isWebSerialSupported } from './serialService';

export type UnlistenFn = () => void;

export const HardwareService = {

  async getAvailablePorts(): Promise<string[]> {
    if (!isWebSerialSupported()) {
      return ['(Web Serial indisponível — use o app desktop)'];
    }
    return ['(ESP32 — clique Compilar, depois Gravar)'];
  },

  /**
   * Enfileira compilação e retorna jobId.
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
    // FIX Chromebook: erro claro em vez de crash
    if (!isWebSerialSupported()) {
      throw new Error(
        'Web Serial API não disponível neste dispositivo.\n' +
        'No Chromebook: ative em chrome://flags/#enable-experimental-web-platform-features\n' +
        'Ou use o app desktop Bloquin para monitorar a serial.'
      );
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