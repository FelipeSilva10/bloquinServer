/**
 * serialService.ts
 *
 * Abstração sobre Web Serial API + esptool-js v0.6.
 *
 * API verificada contra node_modules/esptool-js/lib/esploader.d.ts:
 *   - loader.main()            → Promise<string> (retorna nome do chip)
 *   - loader.writeFlash(opts)  → Promise<void>   (opts.fileArray[].data é Uint8Array)
 *   - loader.after(mode)       → Promise<void>   (mode: 'hard_reset' | 'soft_reset' | …)
 *   - Transport(device)        → constructor recebe SerialPort diretamente
 *
 * Tipos SerialPort definidos em src/types/web-serial.d.ts.
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

// ── Estado interno do monitor serial ─────────────────────────────────────────

let monitorPort:   SerialPort | null = null;
let monitorReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let monitorActive  = false;

// ── Flash ─────────────────────────────────────────────────────────────────────

/**
 * Grava um binário no ESP32 via Web Serial + esptool-js.
 *
 * Fluxo (conforme PDD):
 *  1. requestPort() — o browser exibe o seletor de porta
 *  2. Transport(port) — wrap esptool-js sobre a porta
 *  3. ESPLoader.main() — handshake ROM, retorna nome do chip
 *  4. ESPLoader.writeFlash() — grava o .bin em 0x10000 com compressão + MD5
 *  5. ESPLoader.after('hard_reset') — reinicia o ESP32
 *  6. transport.disconnect() — fecha a porta
 */
export async function flashESP32(
  firmware:    ArrayBuffer,
  onLog:       FlashLogFn,
  onProgress:  FlashProgressFn,
): Promise<void> {

  // 1. Solicitar porta ao usuário (requer gesto — deve ser chamado em handler de clique)
  let port: SerialPort;
  try {
    port = await navigator.serial.requestPort({ filters: [] });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'NotAllowedError') {
      throw new Error('Porta não selecionada. Selecione a porta do ESP32 para continuar.');
    }
    throw err;
  }

  // Terminal que redireciona os logs internos do esptool-js para nosso callback
  const terminal = {
    clean:     () => {},
    writeLine: (data: string) => onLog(data),
    write:     (data: string) => { if (data.trim()) onLog(data.trim()); },
  };

  // 2. Criar Transport (recebe SerialPort diretamente — sem Transport.connect manual)
  const transport = new Transport(port);

  try {
    // 3. Conectar ao ESP32 — ESPLoader controla DTR/RTS para modo de gravação
    onLog('Conectando ao ESP32…');
    const loader = new ESPLoader({
      transport,
      baudrate: 115200,    // esptool-js negocia subida para 921600 internamente
      terminal,
      debugLogging: false,
    });

    const chipName = await loader.main();
    onLog(`Chip: ${chipName}`);

    // 4. Gravar o binário
    //    - data: Uint8Array (não string — verificado em FlashOptions.fileArray[].data)
    //    - address: 0x10000 = app binary para ESP32 (arduino-cli gera .ino.bin para este offset)
    //    - calculateMD5Hash: recebe Uint8Array — usar CryptoJS.lib.WordArray.create()
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

    // 5. Reset após gravação
    onLog('Reiniciando ESP32…');
    await loader.after('hard_reset');
    onLog('Gravação concluída!');

  } finally {
    // 6. Sempre desconectar a porta, mesmo em caso de erro
    try { await transport.disconnect(); } catch { /* porta já fechada */ }
  }
}

// ── Monitor Serial ────────────────────────────────────────────────────────────

/**
 * Abre porta serial e emite linhas via callback.
 * Para o monitor anterior se já estiver ativo.
 */
export async function startMonitor(
  baudRate:  number,
  onMessage: (line: string) => void,
): Promise<void> {
  // Para qualquer monitor anterior
  await stopMonitor();

  // requestPort — requer gesto do usuário
  monitorPort = await navigator.serial.requestPort({ filters: [] });
  await monitorPort.open({ baudRate });

  monitorActive = true;
  monitorReader = monitorPort.readable!.getReader();

  // Loop de leitura em background — não bloqueia
  _readLoop(monitorReader, onMessage).catch(() => {
    // Porta fechada normalmente pelo stopMonitor()
  });
}

/**
 * Para o monitor serial e fecha a porta.
 */
export async function stopMonitor(): Promise<void> {
  monitorActive = false;

  try { await monitorReader?.cancel(); }    catch { /* ignora */ }
  try { monitorReader?.releaseLock(); }      catch { /* ignora */ }
  try { await monitorPort?.close(); }        catch { /* ignora */ }

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

    // Emite linhas completas (terminadas em \n)
    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).replace(/\r$/, '').trim();
      buffer     = buffer.slice(idx + 1);
      if (line) onMessage(line);
    }

    // Segurança: descarta buffer sem newline se crescer demais (lixo de boot)
    if (buffer.length > 4000) buffer = '';
  }
}
