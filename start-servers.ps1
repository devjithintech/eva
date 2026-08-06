<#
.SYNOPSIS
  Build and start all LightHouse servers under pm2.

.DESCRIPTION
  Starts two pm2 processes:
    lhp-server     - the agent/BFF server (server/, Express) on -ServerPort
    lhp-dashboard  - the dashboard UI (dashboard-ui/dist) served as a static
                     SPA on -UiPort

  The UI is served from built files, so API URLs are baked in at build time
  (there is no Vite dev proxy in production). The script builds the UI with
  VITE_API_URL pointing at the configured server port; the BFF has open CORS,
  so the cross-origin calls work. Already-built files can be supplied instead
  via -UiDist (skips the UI build).

  The renderers service (D1-x panels, default http://127.0.0.1:8765) is a
  separate deployment NOT managed by this script - only its URL is baked into
  the UI build via -RenderersUrl.

.PARAMETER ServerPort
  Port for the agent/BFF server. Default 8787.

.PARAMETER UiPort
  Port the built dashboard is served on. Default 5174.

.PARAMETER ApiUrl
  BFF base URL baked into the UI build. Default http://localhost:<ServerPort>/api.
  Set explicitly when the browser reaches the server via another host name.

.PARAMETER RenderersUrl
  Renderers service base URL baked into the UI build. Default http://127.0.0.1:8765.

.PARAMETER UiDist
  Path to an already-built dashboard (a dist folder). When set, the UI build
  step is skipped and this folder is served as-is. NOTE: its baked-in API URLs
  must match the ports you start the servers on.

.PARAMETER SkipBuild
  Reuse existing server/dist and dashboard-ui/dist without rebuilding.

.EXAMPLE
  .\start-servers.ps1
  .\start-servers.ps1 -ServerPort 9000 -UiPort 8080
  .\start-servers.ps1 -UiDist C:\builds\dashboard-dist -SkipBuild
#>
[CmdletBinding()]
param(
  [int]$ServerPort = 8787,
  [int]$UiPort = 5174,
  [string]$ApiUrl = "",
  [string]$RenderersUrl = "http://127.0.0.1:8765",
  [string]$UiDist = "",
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$serverDir = Join-Path $root "server"
$uiDir = Join-Path $root "dashboard-ui"
$serverEntry = Join-Path $serverDir "dist\index.js"
if (-not $ApiUrl) { $ApiUrl = "http://localhost:$ServerPort/api" }
if (-not $UiDist) { $UiDist = Join-Path $uiDir "dist" }

function Invoke-Step([string]$label, [scriptblock]$body) {
  Write-Host "==> $label" -ForegroundColor Cyan
  & $body
  if ($LASTEXITCODE -ne 0) { throw "$label failed (exit $LASTEXITCODE)" }
}

# ── prerequisites ────────────────────────────────────────────────────────────
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm not found on PATH - install Node.js first (https://nodejs.org)"
}
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
  Invoke-Step "Installing pm2 globally" { npm install -g pm2 }
}

# ── dependencies ─────────────────────────────────────────────────────────────
if (-not (Test-Path (Join-Path $serverDir "node_modules"))) {
  Invoke-Step "Installing server dependencies" { npm install --prefix $serverDir }
}
if (-not $SkipBuild -and -not (Test-Path (Join-Path $uiDir "node_modules"))) {
  Invoke-Step "Installing dashboard dependencies" { npm install --prefix $uiDir }
}

# ── build ────────────────────────────────────────────────────────────────────
if ($SkipBuild) {
  if (-not (Test-Path $serverEntry)) { throw "-SkipBuild set but $serverEntry does not exist" }
} else {
  Invoke-Step "Building server" { npm run build --prefix $serverDir }
}

$buildUi = -not $SkipBuild -and ($UiDist -eq (Join-Path $uiDir "dist"))
if ($buildUi) {
  # Vite only reads VITE_* vars at build time - bake in the configured URLs.
  $env:VITE_API_URL = $ApiUrl
  $env:VITE_RENDERERS_URL = $RenderersUrl
  try {
    Invoke-Step "Building dashboard (API=$ApiUrl, renderers=$RenderersUrl)" {
      npm run build --prefix $uiDir
    }
  } finally {
    Remove-Item Env:VITE_API_URL -ErrorAction SilentlyContinue
    Remove-Item Env:VITE_RENDERERS_URL -ErrorAction SilentlyContinue
  }
}
if (-not (Test-Path (Join-Path $UiDist "index.html"))) {
  throw "No built dashboard at $UiDist (missing index.html)"
}

# ── (re)start under pm2 ──────────────────────────────────────────────────────
# Spawn the pm2 daemon first so `pm2 jlist` outputs clean JSON (a cold daemon
# prefixes it with "[PM2] Spawning..." banner lines).
pm2 ping | Out-Null

# Replace any prior instances so re-running the script picks up new ports.
$existing = @()
try {
  $existing = @((pm2 jlist | Out-String | ConvertFrom-Json) | ForEach-Object { $_.name })
} catch {
  $existing = @()
}
foreach ($name in @("lhp-server", "lhp-dashboard")) {
  if ($existing -contains $name) {
    Invoke-Step "Removing previous pm2 process '$name'" { pm2 delete $name | Out-Null }
  }
}

$env:PORT = "$ServerPort"
try {
  Invoke-Step "Starting lhp-server on port $ServerPort" {
    pm2 start $serverEntry --name lhp-server --cwd $serverDir --update-env
  }
} finally {
  Remove-Item Env:PORT -ErrorAction SilentlyContinue
}

Invoke-Step "Starting lhp-dashboard on port $UiPort" {
  pm2 serve $UiDist $UiPort --spa --name lhp-dashboard
}

pm2 ls

Write-Host ""
Write-Host "All servers started." -ForegroundColor Green
Write-Host "  Dashboard : http://localhost:$UiPort"
Write-Host "  BFF/API   : http://localhost:$ServerPort/api (docs: /api/docs)"
Write-Host "  Renderers : $RenderersUrl (external - not managed by this script)"
Write-Host ""
Write-Host "pm2 tips: 'pm2 logs', 'pm2 restart all', 'pm2 delete all'."
Write-Host "To survive reboots: 'pm2 save' (plus a startup hook, e.g. pm2-windows-startup)."
