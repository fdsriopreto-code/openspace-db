# OpenSpace-DB installer for Windows — usage:
#   irm <url>/install.ps1 | iex
#
# Mirrors infra/installer/install.sh: gets the `openspace` CLI runnable,
# then delegates all real setup work (env generation, containers,
# first-admin creation) to it.

$ErrorActionPreference = "Stop"

$RepoUrl = if ($env:OPENSPACE_REPO_URL) { $env:OPENSPACE_REPO_URL } else { "https://github.com/openspace-db/openspace-db.git" }
$InstallDir = if ($env:OPENSPACE_INSTALL_DIR) { $env:OPENSPACE_INSTALL_DIR } else { Join-Path $HOME "openspace-db" }

function Write-Ok($msg)   { Write-Host "OK  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "!!  $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "ERR $msg" -ForegroundColor Red; exit 1 }

function Test-CommandExists($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

# --- Docker ---------------------------------------------------------------
if (-not (Test-CommandExists "docker")) {
  Write-Warn "Docker nao encontrado. Instale o Docker Desktop: https://docs.docker.com/desktop/setup/install/windows-install/"
  Write-Fail "Docker e obrigatorio."
}
try { docker info | Out-Null } catch { Write-Fail "Docker esta instalado, mas nao esta em execucao." }
Write-Ok "Docker disponivel."

# --- Node.js / pnpm ---------------------------------------------------------
if (-not (Test-CommandExists "node")) {
  Write-Fail "Node.js >= 20 e obrigatorio. Instale via https://nodejs.org/ e rode este script novamente."
}
$nodeMajor = [int]((node -p "process.versions.node.split('.')[0]"))
if ($nodeMajor -lt 20) {
  Write-Fail "Node.js >= 20 e obrigatorio (encontrado: $(node -v))."
}
Write-Ok "Node.js $(node -v) encontrado."

if (-not (Test-CommandExists "pnpm")) {
  Write-Warn "pnpm nao encontrado - habilitando via corepack."
  corepack enable
  corepack prepare pnpm@10.19.0 --activate
}
Write-Ok "pnpm $(pnpm -v) disponivel."

# --- Codigo-fonte -----------------------------------------------------------
$rootPackageJson = Join-Path (Get-Location) "package.json"
$isInsideRepo = $false
if (Test-Path $rootPackageJson) {
  $isInsideRepo = (Get-Content $rootPackageJson -Raw) -match '"name":\s*"openspace-db-monorepo"'
}

if ($isInsideRepo) {
  $InstallDir = (Get-Location).Path
  Write-Ok "Rodando dentro do repositorio ja clonado ($InstallDir)."
} elseif (Test-Path (Join-Path $InstallDir ".git")) {
  Write-Ok "Repositorio ja existe em $InstallDir - atualizando."
  git -C $InstallDir pull --ff-only
} else {
  if (-not (Test-CommandExists "git")) { Write-Fail "git e obrigatorio para clonar o OpenSpace-DB." }
  Write-Ok "Clonando OpenSpace-DB em $InstallDir."
  git clone $RepoUrl $InstallDir
}

Set-Location $InstallDir

# --- CLI e instalacao ---------------------------------------------------------
Write-Ok "Instalando dependencias (pnpm install)."
pnpm install --frozen-lockfile

Write-Ok "Construindo a CLI."
pnpm --filter openspace-db build

Write-Ok "Iniciando a instalacao (Postgres, API, Dashboard, primeiro administrador)."
node packages/cli/dist/index.js install
