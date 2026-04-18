#!/usr/bin/env bash
# =============================================================================
# setup.sh — Instalação completa do servidor Bloquin (Arch Linux)
#
# O que este script faz:
#   1. Verifica dependências do sistema (Node.js 20+, npm, curl)
#   2. Instala o arduino-cli e configura suporte ao ESP32
#   3. Instala dependências Node.js do servidor
#   4. Build do frontend (React/Vite → /public)
#   5. Cria o banco de dados e popula com usuários iniciais
#   6. Gera JWT_SECRET no arquivo .env
#   7. Imprime instruções de uso
#
# Uso: bash scripts/setup.sh
# Não requer root.
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'; BOLD='\033[1m'

ok()   { echo -e "${GREEN}✓${NC} $*"; }
info() { echo -e "${BLUE}→${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
fail() { echo -e "${RED}✗ ERRO:${NC} $*"; exit 1; }
step() { echo -e "\n${BOLD}[$1/6]${NC} $2"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "\n${BOLD}Bloquin Server — Setup${NC}"
echo "Diretório: $PROJECT_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── [1/6] Dependências do sistema ────────────────────────────────────────────
step 1 "Verificando dependências do sistema"

for cmd in node npm curl; do
  command -v "$cmd" &>/dev/null || fail "$cmd não encontrado. Instale: sudo pacman -S nodejs npm curl"
  ok "$cmd: $(command -v "$cmd")"
done

NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
[ "$NODE_MAJOR" -ge 20 ] || fail "Node.js $(node --version) muito antigo. Precisa de v20+. Use: sudo pacman -S nodejs"
ok "Node.js $(node --version) ✓"

# ── [2/6] arduino-cli + ESP32 ────────────────────────────────────────────────
step 2 "Configurando arduino-cli e suporte ao ESP32"

ARDUINO_CLI_BIN="$HOME/.local/bin/arduino-cli"
export PATH="$HOME/.local/bin:$PATH"

if ! command -v arduino-cli &>/dev/null; then
  info "Baixando arduino-cli..."
  mkdir -p "$HOME/.local/bin"

  ARCH=$(uname -m)
  case "$ARCH" in
    x86_64)  ARC="Linux_64bit" ;;
    aarch64) ARC="Linux_ARM64" ;;
    armv7l)  ARC="Linux_ARMv7" ;;
    *)       fail "Arquitetura não suportada: $ARCH" ;;
  esac

  TMP=$(mktemp -d)
  curl -fsSL "https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_${ARC}.tar.gz" \
    -o "$TMP/cli.tar.gz" || fail "Falha ao baixar arduino-cli."
  tar -xzf "$TMP/cli.tar.gz" -C "$TMP"
  mv "$TMP/arduino-cli" "$ARDUINO_CLI_BIN"
  chmod +x "$ARDUINO_CLI_BIN"
  rm -rf "$TMP"
  ok "arduino-cli instalado em $ARDUINO_CLI_BIN"
else
  ok "arduino-cli já instalado: $(arduino-cli version | head -1)"
fi

# Adicionar URL do ESP32 e instalar core
arduino-cli config init --overwrite 2>/dev/null || true
arduino-cli config add board_manager.additional_urls \
  "https://espressif.github.io/arduino-esp32/package_esp32_index.json" 2>/dev/null || true
arduino-cli core update-index 2>&1 | grep -v "^$" | tail -3

if arduino-cli core list 2>/dev/null | grep -q "esp32:esp32"; then
  ok "Core esp32:esp32 já instalado"
else
  info "Instalando core esp32:esp32 (2–5 minutos)..."
  arduino-cli core install esp32:esp32 2>&1 | tail -5
  ok "Core esp32:esp32 instalado"
fi

# ── [3/6] Dependências do servidor ───────────────────────────────────────────
step 3 "Instalando dependências do servidor"

cd "$PROJECT_DIR"
npm install --silent
ok "Dependências do servidor instaladas"

# ── [4/6] Build do frontend ───────────────────────────────────────────────────
step 4 "Build do frontend (React/Vite)"

if [ -d "$PROJECT_DIR/client" ]; then
  cd "$PROJECT_DIR/client"
  npm install --silent
  npm run build 2>&1 | tail -5
  cd "$PROJECT_DIR"
  ok "Frontend buildado → $PROJECT_DIR/public"
else
  warn "Diretório /client não encontrado. Pulando."
fi

# ── [5/6] Banco de dados ──────────────────────────────────────────────────────
step 5 "Inicializando banco de dados"

mkdir -p "$PROJECT_DIR/data"

if [ -f "$PROJECT_DIR/data/bloquin.db" ]; then
  warn "Banco já existe. Para recriar: rm data/bloquin.db && node scripts/seed.js"
else
  node --experimental-sqlite scripts/seed.js 2>&1 | grep -v ExperimentalWarning
  ok "Banco criado com usuários de teste"
fi

# ── [6/6] JWT_SECRET ──────────────────────────────────────────────────────────
step 6 "Configurando .env"

ENV_FILE="$PROJECT_DIR/.env"

if [ -f "$ENV_FILE" ] && grep -q "JWT_SECRET" "$ENV_FILE"; then
  ok ".env já configurado"
else
  JWT=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  { echo "JWT_SECRET=$JWT"; echo "PORT=3000"; } >> "$ENV_FILE"
  ok ".env criado com JWT_SECRET aleatório"
fi

# Adicionar ~/.local/bin ao PATH permanentemente
if ! grep -q 'local/bin' "${HOME}/.bashrc" 2>/dev/null; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
  warn "Adicionado ~/.local/bin ao .bashrc. Execute: source ~/.bashrc"
fi

# ── Resumo ────────────────────────────────────────────────────────────────────
LAN_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}' \
         || hostname -I 2>/dev/null | awk '{print $1}' \
         || echo "SEU_IP")

echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BOLD}${GREEN}Setup concluído!${NC}\n"
echo -e "Iniciar servidor:  ${BOLD}npm start${NC}"
echo -e "Local:             http://localhost:3000"
echo -e "Rede local:        http://${LAN_IP}:3000\n"
echo -e "Usuários de teste:"
echo -e "  Professor  →  prof / prof123"
echo -e "  Alunos     →  aluno01…aluno15 / aluno123"
