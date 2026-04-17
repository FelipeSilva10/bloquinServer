#!/usr/bin/env bash
# test-compile.sh — Testa o endpoint de compilação manualmente via curl
# Uso: bash scripts/test-compile.sh [URL_DO_SERVIDOR]
# Exemplo: bash scripts/test-compile.sh http://localhost:3000

BASE_URL=${1:-http://localhost:3000}

echo "==> Verificando saúde do servidor em $BASE_URL..."
curl -sf "$BASE_URL/health" | python3 -m json.tool || {
  echo "ERRO: servidor não está respondendo."
  exit 1
}

echo ""
echo "==> Enviando sketch de blink para compilação..."

RESPONSE=$(curl -sf -X POST "$BASE_URL/api/compile" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); delay(500); digitalWrite(2, LOW); delay(500); }"
  }')

echo "$RESPONSE" | python3 -m json.tool

JOB_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('jobId',''))")
SUCCESS=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',''))")

if [ "$SUCCESS" != "True" ]; then
  echo ""
  echo "ERRO: compilação falhou."
  exit 1
fi

echo ""
echo "==> Baixando binário compilado (jobId: $JOB_ID)..."
curl -sf "$BASE_URL/api/binary/$JOB_ID" -o "/tmp/bloquin-test-$JOB_ID.bin"
FILESIZE=$(wc -c < "/tmp/bloquin-test-$JOB_ID.bin")

echo "✓ Binário salvo em /tmp/bloquin-test-$JOB_ID.bin ($FILESIZE bytes)"
