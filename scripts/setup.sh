#!/usr/bin/env bash
# setup.sh — Configura o ambiente do servidor Bloquin (Arch Linux)
# Execute como root ou com sudo.

set -e

echo "==> [1/4] Instalando arduino-cli..."
if command -v arduino-cli &>/dev/null; then
  echo "    arduino-cli já instalado: $(arduino-cli version)"
else
  curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh
  # O binário é instalado em ~/bin por padrão — mover para /usr/local/bin
  mv ~/bin/arduino-cli /usr/local/bin/arduino-cli
  echo "    arduino-cli instalado com sucesso."
fi

echo "==> [2/4] Atualizando índice de plataformas..."
arduino-cli core update-index

echo "==> [3/4] Instalando suporte ao ESP32..."
if arduino-cli core list | grep -q "esp32:esp32"; then
  echo "    esp32:esp32 já instalado."
else
  arduino-cli core install esp32:esp32
fi

echo "==> [4/4] Verificando instalação..."
arduino-cli core list | grep esp32

echo ""
echo "✓ Setup concluído. Para testar, execute:"
echo "  arduino-cli compile --fqbn esp32:esp32:esp32 <caminho_do_sketch>"
