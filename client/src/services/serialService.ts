/**
 * serialService.ts
 *
 * Abstração sobre Web Serial API + esptool-js v0.6.
 *
 * FIX Chromebook: Todos os pontos de entrada agora verificam
 * se navigator.serial existe antes de prosseguir, com mensagens
 * de erro claras e específicas para cada situação.
 *
 * Notas sobre disponibilidade da Web Serial API:
 *   - Chrome/Edge 89+ em HTTPS ou localhost: disponível
 *   - Chromebooks com Chrome OS: disponível (Chrome ≥ 89)
 *   - Chrome com flag desabilitada via policy: indisponível
 *   - Firefox, Safari: indisponível
 */

import { ESPLoader, Transport } from 'esptool-js';
import CryptoJS from 'crypto-js';

// ── Tipos exportados ──────────────────────────────────────────────────────────

export interface FlashProgress {
  percent: number;  // 0–100
  written: number;
  total:   number;
}

export type FlashLogFn      = (line: string) => void;
export type FlashProgressFn = (p: FlashProgress) => void;

// ── Verificação de suporte ────────────────────────────────────────────────────

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator && navigator.serial !== undefined;
}

function assertWebSerial(): void {
  if (!isWebSerialSupported()) {
    throw new Error(
      'Web Serial API não disponível.\n\n' +
      'Para usar a gravação direta no Chromebook:\n' +
      '1. Certifique-se de usar Chrome 89+ ou Edge 89+\n' +
      '2. Acesse via http:// (não https://)\n' +
      '3. Se o erro persistir, ative: chrome://flags/#enable-experimental-web-platform-features\n\n' +
      'Alternativa: use o app desktop Bloquin para gravar.'
    );
  }
}

// ── Estado interno do monitor serial ─────────────────────────────────────────

let monitorPort:   SerialPort | null = null;
let monitorReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let monitorActive  = false;

// ── Flash ─────────────────────────────────────────────────────────────────────

/**
 * Grava um binário no ESP32 via Web Serial + esptool-js.
 */
export async function flashESP32(
  firmware:    ArrayBuffer,
  onLog:       FlashLogFn,
  onProgress:  FlashProgressFn,
): Promise<void> {
  // FIX Chromebook: verificar suporte antes de qualquer operação
  assertWebSerial();

  // 1. Solicitar porta ao usuário
  let port: SerialPort;
  try {
    port = await navigator.serial.requestPort({ filters: [] });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.name === 'NotAllowedError') {
        throw new Error('Porta não selecionada. Selecione a porta do ESP32 para continuar.');
      }
      if (err.name === 'SecurityError') {
        throw new Error(
          'Acesso à porta serial bloqueado pela política do sistema.\n' +
          'Contate o professor ou use o app desktop Bloquin.'
        );
      }
    }
    throw err;
  }

  // Terminal que redireciona logs do esptool-js
  const terminal = {
    clean:     () => {},
    writeLine: (data: string) => onLog(data),
    write:     (data: string) => { if (data.trim()) onLog(data.trim()); },
  };

  const transport = new Transport(port);

  try {
    onLog('Conectando ao ESP32…');
    const loader = new ESPLoader({
      transport,
      baudrate: 115200,
      terminal,
      debugLogging: false,
    });

    const chipName = await loader.main();
    onLog(`Chip: ${chipName}`);

    onLog('Gravando firmware…');
    const firmwareBytes = new Uint8Array(firmware);

    await loader.writeFlash({
      fileArray: [{ data: firmwareBytes, address: 0x10000 }],
      flashMode:  'keep',
      flashFreq:  'keep',
      flashSize:  'keep',
      eraseAll:   false,
      compress:   true,
      reportProgress: (_fileIndex: number, written: number, total: number) => {
        const percent = Math.round((written / total) * 100);
        onProgress({ percent, written, total });
      },
      calculateMD5Hash: (image: Uint8Array): string => {
        const wordArray = CryptoJS.lib.WordArray.create(image as unknown as number[]);
        return CryptoJS.MD5(wordArray).toString();
      },
    });

    onLog('Reiniciando ESP32…');
    await loader.after('hard_reset');
    onLog('Gravação concluída!');

  } finally {
    try { await transport.disconnect(); } catch { /* porta já fechada */ }
  }
}

// ── Monitor Serial ────────────────────────────────────────────────────────────

/**
 * Abre porta serial e emite linhas via callback.
 */
export async function startMonitor(
  baudRate:  number,
  onMessage: (line: string) => void,
): Promise<void> {
  // FIX Chromebook: verificar suporte antes de qualquer operação
  assertWebSerial();

  await stopMonitor();

  let port: SerialPort;
  try {
    port = await navigator.serial.requestPort({ filters: [] });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'NotAllowedError') {
      throw new Error('Porta não selecionada. Selecione a porta do ESP32 para monitorar.');
    }
    throw err;
  }

  await port.open({ baudRate });

  monitorPort   = port;
  monitorActive = true;
  monitorReader = port.readable!.getReader();

  _readLoop(monitorReader, onMessage).catch(() => {
    // Porta fechada normalmente pelo stopMonitor()
  });
}

/**
 * Para o monitor serial e fecha a porta.
 */
export async function stopMonitor(): Promise<void> {
  monitorActive = false;

  try { await monitorReader?.cancel(); }   catch { /* ignora */ }
  try { monitorReader?.releaseLock(); }    catch { /* ignora */ }
  try { await monitorPort?.close(); }      catch { /* ignora */ }

  monitorReader = null;
  monitorPort   = null;
}

// ── Interno ───────────────────────────────────────────────────────────────────

async function _readLoop(
  reader:    ReadableStreamDefaultReader<Uint8Array>,
  onMessage: (line: string) => void,
): Promise<void> {
  const decoder = new TextDecoder();
  let   buffer  = '';

  while (monitorActive) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).replace(/\r$/, '').trim();
      buffer     = buffer.slice(idx + 1);
      if (line) onMessage(line);
    }

    if (buffer.length > 4000) buffer = '';
  }
}