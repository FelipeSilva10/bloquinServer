import { spawn } from 'child_process';
import { mkdir, writeFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP_DIR = path.resolve(__dirname, '../../tmp');
const BINARIES_DIR = path.resolve(__dirname, '../../data/binaries');

// FQBN padrão do ESP32 — ajuste se usar uma variante diferente (ex: esp32:esp32:esp32wrover)
const ESP32_FQBN = 'esp32:esp32:esp32';

/**
 * Compila um sketch .ino e retorna o caminho do binário gerado.
 *
 * @param {string} jobId  - ID único do job
 * @param {string} code   - Código C++ / Arduino completo
 * @returns {Promise<{ success: boolean, binaryPath?: string, stdout: string, stderr: string }>}
 */
export async function compile(jobId, code) {
  const jobDir   = path.join(TMP_DIR, jobId);
  const sketchDir = path.join(jobDir, 'sketch');
  const buildDir  = path.join(jobDir, 'build');
  const sketchFile = path.join(sketchDir, 'sketch.ino');
  const binaryPath = path.join(BINARIES_DIR, `${jobId}.bin`);

  // Criar diretórios temporários para este job
  await mkdir(sketchDir, { recursive: true });
  await mkdir(buildDir,  { recursive: true });
  await mkdir(BINARIES_DIR, { recursive: true });

  // Escrever o sketch
  await writeFile(sketchFile, code, 'utf-8');

  try {
    const { stdout, stderr } = await runArduinoCli(sketchDir, buildDir);

    // O arduino-cli gera o binário com extensão .ino.bin dentro do buildDir
    const generatedBin = path.join(buildDir, 'sketch.ino.bin');

    if (!existsSync(generatedBin)) {
      return { success: false, stdout, stderr: stderr || 'Binário não gerado.' };
    }

    // Mover para o diretório de binários com nome baseado no jobId
    const { copyFile } = await import('fs/promises');
    await copyFile(generatedBin, binaryPath);

    return { success: true, binaryPath, stdout, stderr };
  } finally {
    // Limpar arquivos temporários independente do resultado
    await rm(jobDir, { recursive: true, force: true });
  }
}

/**
 * Executa o arduino-cli e coleta saída completa.
 * Rejeita a Promise se o processo terminar com código != 0.
 */
function runArduinoCli(sketchDir, buildDir) {
  return new Promise((resolve, reject) => {
    const args = [
      'compile',
      '--fqbn', ESP32_FQBN,
      '--build-path', buildDir,
      sketchDir,
    ];

    const proc = spawn('arduino-cli', args);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('Timeout: compilação excedeu 60 segundos.'));
    }, 60_000);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(Object.assign(new Error('Compilação falhou.'), { stdout, stderr }));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      // Erro mais comum: arduino-cli não instalado
      if (err.code === 'ENOENT') {
        reject(new Error('arduino-cli não encontrado. Execute scripts/setup.sh primeiro.'));
      } else {
        reject(err);
      }
    });
  });
}
