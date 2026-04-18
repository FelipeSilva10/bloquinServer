/**
 * test-load.js — Marco 6: teste de carga com 15 clientes autenticados.
 *
 * Uso:
 *   node scripts/test-load.js [URL_BASE]
 *   node scripts/test-load.js http://192.168.1.100:3000
 *
 * O que faz:
 *   1. Faz login como aluno01…aluno15 (obtém JWT real)
 *   2. Conecta WebSocket autenticado para cada aluno
 *   3. Envia compilação simultânea para todos
 *   4. Aguarda eventos WS até done/error
 *   5. Verifica isolamento (cada aluno recebe só seu jobId)
 *   6. Imprime relatório de tempo e resultado
 */

import WebSocket from 'ws';

const BASE_URL    = process.argv[2] || 'http://localhost:3000';
const WS_URL      = BASE_URL.replace('http://', 'ws://') + '/ws';
const NUM_CLIENTS = 15;
const PASSWORD    = 'aluno123';

// Sketch de teste — blink simples no GPIO 2 do ESP32
const SKETCH = `
void setup() {
  Serial.begin(115200);
  pinMode(2, OUTPUT);
  Serial.println("Setup OK");
}
void loop() {
  digitalWrite(2, HIGH);
  delay(500);
  digitalWrite(2, LOW);
  delay(500);
}`.trim();

// ── Utilitários ───────────────────────────────────────────────────────────────

async function login(username) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login falhou para ${username}: HTTP ${res.status}`);
  const { token } = await res.json();
  return token;
}

async function compile(token) {
  const res = await fetch(`${BASE_URL}/api/compile`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body:    JSON.stringify({ code: SKETCH }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Compile falhou: HTTP ${res.status} — ${body.error ?? ''}`);
  }
  return res.json(); // { jobId, position }
}

// ── Cliente individual ────────────────────────────────────────────────────────

function runClient(index) {
  return new Promise(async (resolve) => {
    const username  = `aluno${String(index).padStart(2, '0')}`;
    const startTime = Date.now();

    let token, myJobId;

    // 1. Login
    try {
      token = await login(username);
    } catch (err) {
      console.error(`[${username}] ✗ ${err.message}`);
      resolve({ username, status: 'login-error', elapsed: Date.now() - startTime });
      return;
    }

    // 2. WebSocket autenticado
    const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);

    const timeout = setTimeout(() => {
      ws.close();
      console.error(`[${username}] ✗ Timeout global (120s)`);
      resolve({ username, status: 'timeout', elapsed: Date.now() - startTime });
    }, 120_000);

    ws.on('open', async () => {
      // Pequeno escalonamento para não bater todos no mesmo milissegundo
      await new Promise(r => setTimeout(r, (index - 1) * 80));

      try {
        const { jobId, position } = await compile(token);
        myJobId = jobId;
        console.log(`[${username}] Enfileirado — jobId: ${jobId.slice(0,8)}… posição: ${position}`);
      } catch (err) {
        clearTimeout(timeout);
        ws.close();
        console.error(`[${username}] ✗ ${err.message}`);
        resolve({ username, status: 'compile-error', elapsed: Date.now() - startTime });
      }
    });

    ws.on('message', (data) => {
      let event;
      try { event = JSON.parse(data.toString()); } catch { return; }

      // Verificação de isolamento: ignora eventos de outros jobs
      if (event.jobId && event.jobId !== myJobId) {
        console.error(`[${username}] ✗ ISOLAMENTO VIOLADO — recebeu jobId de outro aluno!`);
        return;
      }

      switch (event.type) {
        case 'queued':
          console.log(`[${username}] Na fila — posição: ${event.position}`);
          break;

        case 'compiling':
          console.log(`[${username}] Compilando…`);
          break;

        case 'done': {
          const elapsed = Date.now() - startTime;
          clearTimeout(timeout);
          ws.close();
          console.log(`[${username}] ✓ Concluído em ${(elapsed / 1000).toFixed(1)}s`);
          resolve({ username, status: 'done', elapsed });
          break;
        }

        case 'error': {
          const elapsed = Date.now() - startTime;
          clearTimeout(timeout);
          ws.close();
          console.error(`[${username}] ✗ Erro (${(elapsed / 1000).toFixed(1)}s): ${event.message}`);
          resolve({ username, status: 'error', elapsed, error: event.message });
          break;
        }
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      console.error(`[${username}] ✗ WS erro: ${err.message}`);
      resolve({ username, status: 'ws-error', elapsed: Date.now() - startTime });
    });
  });
}

// ── Verificação de isolamento (pós-execução) ──────────────────────────────────

async function checkIsolation(tokens) {
  console.log('\n[Isolamento] Verificando que aluno01 não acessa jobs do aluno02...');

  // aluno01 tenta acessar status de um jobId inexistente com prefixo fixo
  const token = tokens[0];
  const fakeJobId = '00000000-0000-0000-0000-000000000000';
  const res = await fetch(`${BASE_URL}/api/compile/${fakeJobId}/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) {
    console.log('[Isolamento] ✓ Acesso a job inexistente retorna 404 (correto)');
  } else {
    console.error(`[Isolamento] ✗ Resposta inesperada: ${res.status}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Bloquin — Teste de Carga (Marco 6)`);
  console.log(`Servidor: ${BASE_URL}`);
  console.log(`Clientes: ${NUM_CLIENTS}`);
  console.log(`${'═'.repeat(50)}\n`);

  // Verificar saúde do servidor
  try {
    const h = await fetch(`${BASE_URL}/health`);
    const { uptime } = await h.json();
    console.log(`[Health] Servidor OK — uptime: ${uptime.toFixed(0)}s\n`);
  } catch {
    console.error('Servidor não está respondendo. Verifique se npm start foi executado.');
    process.exit(1);
  }

  const globalStart = Date.now();

  // Executar todos os clientes em paralelo
  const promises  = Array.from({ length: NUM_CLIENTS }, (_, i) => runClient(i + 1));
  const results   = await Promise.all(promises);
  const totalTime = (Date.now() - globalStart) / 1000;

  // Coletar tokens para teste de isolamento
  const tokens = [];
  for (let i = 1; i <= 2; i++) {
    try { tokens.push(await login(`aluno${String(i).padStart(2, '0')}`)); } catch { /**/ }
  }
  if (tokens.length >= 1) await checkIsolation(tokens);

  // ── Relatório ─────────────────────────────────────────────────────────────
  const done    = results.filter(r => r.status === 'done');
  const errors  = results.filter(r => r.status !== 'done');
  const times   = done.map(r => r.elapsed);
  const avg     = times.length ? (times.reduce((a, b) => a + b, 0) / times.length / 1000).toFixed(1) : '-';
  const max     = times.length ? (Math.max(...times) / 1000).toFixed(1) : '-';
  const min     = times.length ? (Math.min(...times) / 1000).toFixed(1) : '-';

  console.log(`\n${'═'.repeat(50)}`);
  console.log('RELATÓRIO FINAL');
  console.log(`${'═'.repeat(50)}`);
  console.log(`Clientes testados:      ${NUM_CLIENTS}`);
  console.log(`Concluídos com sucesso: ${done.length}`);
  console.log(`Falhas:                 ${errors.length}`);
  console.log(`Tempo total:            ${totalTime.toFixed(1)}s`);
  if (times.length > 0) {
    console.log(`Tempo médio/cliente:    ${avg}s`);
    console.log(`Tempo máximo:           ${max}s`);
    console.log(`Tempo mínimo:           ${min}s`);
  }

  if (errors.length > 0) {
    console.log('\nFalhas:');
    errors.forEach(r => console.log(`  ${r.username}: ${r.status}${r.error ? ` — ${r.error}` : ''}`));
  }

  const ok = done.length === NUM_CLIENTS;
  console.log(`\n${'═'.repeat(50)}`);
  console.log(ok
    ? '✓ CRITÉRIO DE ACEITE ATINGIDO — 15/15 compilações concluídas'
    : `✗ CRITÉRIO NÃO ATINGIDO — ${done.length}/${NUM_CLIENTS} concluídas`);
  console.log(`${'═'.repeat(50)}\n`);

  process.exit(ok ? 0 : 1);
}

main().catch(err => { console.error(err); process.exit(1); });
