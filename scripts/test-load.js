/**
 * test-load.js — Simula 15 clientes enviando compilações simultâneas.
 *
 * Uso: node scripts/test-load.js [URL_BASE]
 * Exemplo: node scripts/test-load.js http://localhost:3000
 *
 * Cada cliente:
 *   1. Conecta ao WebSocket com seu clientId
 *   2. Envia um POST /api/compile
 *   3. Aguarda os eventos WebSocket até 'done' ou 'error'
 *   4. Registra o tempo total
 */

import WebSocket from 'ws';

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const WS_URL   = BASE_URL.replace('http://', 'ws://') + '/ws';
const NUM_CLIENTS = 15;

const SKETCH = `
void setup() {
  pinMode(2, OUTPUT);
}
void loop() {
  digitalWrite(2, HIGH);
  delay(500);
  digitalWrite(2, LOW);
  delay(500);
}
`.trim();

// Resultados agregados
const results = { done: 0, error: 0, times: [] };

function runClient(clientIndex) {
  return new Promise((resolve) => {
    const clientId = `test-client-${clientIndex}`;
    const startTime = Date.now();

    const ws = new WebSocket(`${WS_URL}?clientId=${clientId}`);

    ws.on('open', async () => {
      // Pequeno escalonamento para não bater todos exatamente ao mesmo tempo
      await new Promise(r => setTimeout(r, clientIndex * 50));

      const res = await fetch(`${BASE_URL}/api/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: SKETCH, clientId }),
      });

      const json = await res.json();

      if (!res.ok) {
        console.error(`[${clientId}] Erro HTTP ${res.status}:`, json);
        ws.close();
        results.error++;
        resolve({ clientId, status: 'http-error', elapsed: Date.now() - startTime });
        return;
      }

      console.log(`[${clientId}] Enfileirado. jobId: ${json.jobId} | posição: ${json.position}`);
    });

    ws.on('message', (data) => {
      const event = JSON.parse(data.toString());

      switch (event.type) {
        case 'connected':
          break;
        case 'queued':
          console.log(`[${clientId}] Na fila. Posição: ${event.position}`);
          break;
        case 'compiling':
          console.log(`[${clientId}] Compilando...`);
          break;
        case 'done': {
          const elapsed = Date.now() - startTime;
          console.log(`[${clientId}] ✓ Concluído em ${(elapsed / 1000).toFixed(1)}s`);
          results.done++;
          results.times.push(elapsed);
          ws.close();
          resolve({ clientId, status: 'done', elapsed });
          break;
        }
        case 'error': {
          const elapsed = Date.now() - startTime;
          console.error(`[${clientId}] ✗ Erro em ${(elapsed / 1000).toFixed(1)}s:`, event.message);
          results.error++;
          ws.close();
          resolve({ clientId, status: 'error', elapsed });
          break;
        }
      }
    });

    ws.on('error', (err) => {
      console.error(`[${clientId}] Erro WebSocket:`, err.message);
      results.error++;
      resolve({ clientId, status: 'ws-error', elapsed: Date.now() - startTime });
    });
  });
}

async function main() {
  console.log(`\nIniciando teste de carga: ${NUM_CLIENTS} clientes simultâneos`);
  console.log(`Servidor: ${BASE_URL}\n`);

  const globalStart = Date.now();
  const promises = Array.from({ length: NUM_CLIENTS }, (_, i) => runClient(i + 1));
  await Promise.all(promises);
  const totalTime = ((Date.now() - globalStart) / 1000).toFixed(1);

  console.log('\n--- Resumo ---');
  console.log(`Clientes: ${NUM_CLIENTS}`);
  console.log(`Concluídos com sucesso: ${results.done}`);
  console.log(`Erros: ${results.error}`);
  console.log(`Tempo total: ${totalTime}s`);

  if (results.times.length > 0) {
    const avg = (results.times.reduce((a, b) => a + b, 0) / results.times.length / 1000).toFixed(1);
    const max = (Math.max(...results.times) / 1000).toFixed(1);
    console.log(`Tempo médio por cliente: ${avg}s`);
    console.log(`Tempo máximo: ${max}s`);
  }
}

main().catch(console.error);
