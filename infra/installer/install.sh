#!/usr/bin/env bash
# OpenSpace-DB installer — usage: curl -fsSL <url>/install.sh | bash
#
# Installs (if missing) Docker + Node.js/pnpm prerequisites, fetches the
# OpenSpace-DB source, and delegates everything else (env generation,
# container bring-up, first-admin creation) to the `openspace` CLI — see
# packages/cli. This script's only job is "get the CLI runnable", not
# reimplement its logic.
set -euo pipefail

REPO_URL="${OPENSPACE_REPO_URL:-https://github.com/openspace-db/openspace-db.git}"
INSTALL_DIR="${OPENSPACE_INSTALL_DIR:-$HOME/openspace-db}"

log()  { printf '\033[0;32m✓\033[0m %s\n' "$1"; }
warn() { printf '\033[0;33m!\033[0m %s\n' "$1"; }
fail() { printf '\033[0;31m✗\033[0m %s\n' "$1"; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1
}

# --- Docker -------------------------------------------------------------
if ! require_cmd docker; then
  warn "Docker não encontrado. Instale o Docker Engine/Desktop antes de continuar:"
  echo "  https://docs.docker.com/engine/install/"
  fail "Docker é obrigatório."
fi
docker info >/dev/null 2>&1 || fail "Docker está instalado, mas não está em execução."
log "Docker disponível."

# --- Node.js / corepack / pnpm ------------------------------------------
if ! require_cmd node; then
  fail "Node.js >= 20 é obrigatório. Instale via https://nodejs.org/ ou nvm e rode este script novamente."
fi
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 20 ]; then
  fail "Node.js >= 20 é obrigatório (encontrado: $(node -v))."
fi
log "Node.js $(node -v) encontrado."

if ! require_cmd pnpm; then
  warn "pnpm não encontrado — habilitando via corepack."
  corepack enable
  corepack prepare pnpm@10.19.0 --activate
fi
log "pnpm $(pnpm -v) disponível."

# --- Código-fonte ---------------------------------------------------------
if [ -f "package.json" ] && grep -q '"name": "openspace-db-monorepo"' package.json 2>/dev/null; then
  INSTALL_DIR="$(pwd)"
  log "Rodando dentro do repositório já clonado ($INSTALL_DIR)."
elif [ -d "$INSTALL_DIR/.git" ]; then
  log "Repositório já existe em $INSTALL_DIR — atualizando."
  git -C "$INSTALL_DIR" pull --ff-only
else
  require_cmd git || fail "git é obrigatório para clonar o OpenSpace-DB."
  log "Clonando OpenSpace-DB em $INSTALL_DIR."
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# --- CLI e instalação ------------------------------------------------------
log "Instalando dependências (pnpm install)."
pnpm install --frozen-lockfile

log "Construindo a CLI."
pnpm --filter openspace-db build

log "Iniciando a instalação (Postgres, API, Dashboard, primeiro administrador)."
node packages/cli/dist/index.js install
