#!/usr/bin/env bash
# Gera public/js/config.js a partir de .env (rodar na VPS após git pull)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"
OUT="$ROOT/public/js/config.js"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Erro: $ENV_FILE ausente. Copie .env.example e preencha."
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_PUBLISHABLE_KEY:-}" ]]; then
  echo "Erro: SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY obrigatórios em .env"
  exit 1
fi

cat > "$OUT" <<EOF
// Gerado por deploy/gen-config.sh — não editar manualmente
window.VITOROS_CONFIG = {
  supabaseUrl: "${SUPABASE_URL}",
  supabaseKey: "${SUPABASE_PUBLISHABLE_KEY}",
};
EOF
echo "✅ config.js gerado ($(wc -c < "$OUT") bytes)"
