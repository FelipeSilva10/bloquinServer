#!/usr/bin/env bash
# =============================================================================
# rotate-secret.sh — Rotaciona o JWT_SECRET no .env
#
# QUANDO USAR:
#   - Imediatamente se o .env foi exposto (comitado, compartilhado, etc.)
#   - Periodicamente como higiene de segurança (ex: início de semestre)
#
# EFEITO: todos os tokens ativos são invalidados.
#         Alunos e professores precisarão fazer login novamente.
#
# Uso: bash scripts/rotate-secret.sh
# =============================================================================

set -euo pipefail

ENV_FILE="$(dirname "$0")/../.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERRO: .env não encontrado em $ENV_FILE"
  exit 1
fi

NEW_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

if grep -q "JWT_SECRET" "$ENV_FILE"; then
  # Substitui a linha existente (compatível com macOS e Linux)
  sed -i "s/^JWT_SECRET=.*/JWT_SECRET=${NEW_SECRET}/" "$ENV_FILE"
else
  echo "JWT_SECRET=${NEW_SECRET}" >> "$ENV_FILE"
fi

echo "✓ JWT_SECRET rotacionado com sucesso."
echo "  Reinicie o servidor para aplicar: npm start"
echo "  Todos os tokens ativos foram invalidados."
