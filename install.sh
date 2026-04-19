#!/usr/bin/env bash
# install.sh — Instala o painel de controle do Bloquin
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLOQUIN_DIR="$(dirname "$SCRIPT_DIR")"   # raiz do bloquin-server

echo "==> Instalando dependências..."
sudo pacman -S --needed --noconfirm python-gobject gtk3

echo "==> Copiando script de controle..."
cp "$SCRIPT_DIR/bloquin-control.py" "$BLOQUIN_DIR/bloquin-control.py"
chmod +x "$BLOQUIN_DIR/bloquin-control.py"

echo "==> Criando atalho no menu de aplicativos..."
DESKTOP_FILE="$HOME/.local/share/applications/bloquin-control.desktop"
mkdir -p "$(dirname "$DESKTOP_FILE")"

cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Name=Bloquin Control
Comment=Painel de controle do servidor Bloquin
Exec=python3 $BLOQUIN_DIR/bloquin-control.py
Icon=network-wireless
Terminal=false
Type=Application
Categories=Education;Network;
Keywords=bloquin;robotica;servidor;
StartupNotify=true
EOF

echo "==> Criando atalho na área de trabalho..."
DESKTOP_HOME="$HOME/Desktop/bloquin-control.desktop"
cp "$DESKTOP_FILE" "$DESKTOP_HOME" 2>/dev/null || true
chmod +x "$DESKTOP_HOME" 2>/dev/null || true

echo ""
echo "✓ Instalado com sucesso!"
echo ""
echo "Para abrir:"
echo "  python3 $BLOQUIN_DIR/bloquin-control.py"
echo ""
echo "Ou procure 'Bloquin Control' no menu de aplicativos."
