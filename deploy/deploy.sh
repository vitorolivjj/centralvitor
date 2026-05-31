#!/usr/bin/env bash
# Atualiza o site estático na VPS. Rodar DENTRO de /opt/centralvitor na VPS.
set -euo pipefail

cd "$(dirname "$0")/.."
echo "==> git pull..."
git pull --ff-only origin main
echo "==> recarregando nginx..."
nginx -t && systemctl reload nginx
echo "✅ Central Vitor atualizado."
