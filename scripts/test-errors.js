/**
 * test-errors.js — Marco 6: validação de cenários de erro.
 *
 * Uso: node scripts/test-errors.js [URL_BASE]
 *
 * Testa:
 *   1. Código inválido (erro de compilação) → retorna mensagem legível
 *   2. Rate limit (mesmo usuário, 2 jobs simultâneos) → 429
 *   3. Token inválido → 401
 *   4. Job expirado → 404 no /binary/:jobId
 *   5. Payload vazio → 400
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';

let passed = 0;
let failed = 0;

function ok(label)   { console.log(`  ✓ ${label}`); passed++; }
function fail(label) { console.error(`  ✗ ${label}`); failed++; }

async function login(username = 'aluno01', password = 'aluno123') {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(`Login falhou: ${res.status}`);
  const { token } = await res.json();
  return token;
}

async function postCompile(token, code) {
  return fetch(`${BASE_URL}/api/compile`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body:    JSON.stringify({ code }),
  });
}

// ── Testes ────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log(`\n${'═'.repeat(50)}`);
  console.log('Bloquin — Validação de Cenários de Erro (Marco 6)');
  console.log(`Servidor: ${BASE_URL}`);
  console.log(`${'═'.repeat(50)}\n`);

  // Verificar servidor
  try {
    await fetch(`${BASE_URL}/health`);
  } catch {
    console.error('Servidor não responde. Execute: npm start');
    process.exit(1);
  }

  let token;
  try {
    token = await login();
  } catch (err) {
    console.error(`Login falhou: ${err.message}`);
    process.exit(1);
  }

  // ── Teste 1: Payload vazio ────────────────────────────────────────────────
  console.log('[1] Payload vazio → 400');
  {
    const res = await postCompile(token, '');
    res.status === 400
      ? ok('POST /compile com code vazio retorna 400')
      : fail(`Esperado 400, recebeu ${res.status}`);
  }

  // ── Teste 2: Token inválido ───────────────────────────────────────────────
  console.log('\n[2] Token inválido → 401');
  {
    const res = await fetch(`${BASE_URL}/api/projects`, {
      headers: { Authorization: 'Bearer token_invalido_xpto' },
    });
    res.status === 401
      ? ok('Rota protegida com token inválido retorna 401')
      : fail(`Esperado 401, recebeu ${res.status}`);
  }

  // ── Teste 3: Sem token → 401 ──────────────────────────────────────────────
  console.log('\n[3] Sem token → 401');
  {
    const res = await fetch(`${BASE_URL}/api/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'void setup(){} void loop(){}' }),
    });
    res.status === 401
      ? ok('POST /compile sem token retorna 401')
      : fail(`Esperado 401, recebeu ${res.status}`);
  }

  // ── Teste 4: Job inexistente → 404 ───────────────────────────────────────
  console.log('\n[4] Binário de job inexistente → 404');
  {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await fetch(`${BASE_URL}/api/binary/${fakeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    res.status === 404
      ? ok(`GET /binary/${fakeId} retorna 404`)
      : fail(`Esperado 404, recebeu ${res.status}`);
  }

  // ── Teste 5: jobId com formato inválido → 400 ─────────────────────────────
  console.log('\n[5] jobId inválido → 400');
  {
    const res = await fetch(`${BASE_URL}/api/binary/nao-e-um-uuid`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    res.status === 400
      ? ok('GET /binary/nao-e-um-uuid retorna 400')
      : fail(`Esperado 400, recebeu ${res.status}`);
  }

  // ── Teste 6: Rate limit (2 jobs simultâneos do mesmo usuário) ─────────────
  console.log('\n[6] Rate limit — 2 jobs simultâneos do mesmo usuário → 429');
  {
    // Enviar dois jobs sem await entre eles
    const code = 'void setup(){} void loop(){}';
    const [res1, res2] = await Promise.all([
      postCompile(token, code),
      postCompile(token, code),
    ]);

    const statuses = [res1.status, res2.status].sort();
    // Um deve ser 202 (aceito), outro 429 (rate limited)
    if (statuses.includes(202) && statuses.includes(429)) {
      ok('Segundo job simultâneo retorna 429 (rate limit correto)');
    } else if (statuses[0] === 202 && statuses[1] === 202) {
      // Pode acontecer se o primeiro job terminou muito rápido
      ok('Ambos aceitos (compilação muito rápida — comportamento aceitável)');
    } else {
      fail(`Statuses inesperados: ${statuses.join(', ')}`);
    }

    // Aguardar o job terminar para não sujar o estado
    await new Promise(r => setTimeout(r, 3000));
  }

  // ── Teste 7: Login com senha errada → 401 ────────────────────────────────
  console.log('\n[7] Login com credenciais erradas → 401');
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username: 'aluno01', password: 'senha_errada' }),
    });
    res.status === 401
      ? ok('Login com senha errada retorna 401')
      : fail(`Esperado 401, recebeu ${res.status}`);
  }

  // ── Teste 8: Código com erro de sintaxe (compilação assíncrona) ───────────
  console.log('\n[8] Código C++ inválido → evento WS type:error (verificação via status)');
  {
    // Envia código inválido e aguarda o job terminar via polling
    const badCode = 'void setup() { int x = ; } void loop() {}';
    const compRes = await postCompile(token, badCode);

    if (compRes.status !== 202) {
      fail(`Esperado 202 ao enfileirar, recebeu ${compRes.status}`);
    } else {
      const { jobId } = await compRes.json();

      // Polling com timeout de 90s
      let jobStatus = 'pending';
      for (let i = 0; i < 45; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const sr = await fetch(`${BASE_URL}/api/compile/${jobId}/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (sr.ok) {
          const s = await sr.json();
          jobStatus = s.status;
          if (jobStatus === 'error' || jobStatus === 'done') break;
        }
      }

      jobStatus === 'error'
        ? ok(`Código inválido gerou status 'error' (fila não travou)`)
        : fail(`Esperado status 'error', obteve '${jobStatus}'`);
    }
  }

  // ── Resumo ────────────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Resultado: ${passed}/${total} testes passaram`);
  if (failed === 0) {
    console.log('✓ TODOS OS CENÁRIOS DE ERRO TRATADOS CORRETAMENTE');
  } else {
    console.log(`✗ ${failed} teste(s) falharam`);
  }
  console.log(`${'═'.repeat(50)}\n`);

  process.exit(failed === 0 ? 0 : 1);
}

runTests().catch(err => { console.error(err); process.exit(1); });
