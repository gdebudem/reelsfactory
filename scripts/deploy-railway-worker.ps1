# Deploy Railway worker: sync env vars + redeploy.
# Prereq (one-time): npx railway login  OR  set $env:RAILWAY_TOKEN
#
# Usage:
#   cd "c:\cursor\reels factory"
#   npx railway link    # select reelsfactory → worker service
#   powershell -File scripts/deploy-railway-worker.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "=== Reels Factory · Railway worker deploy ==="

# Pull latest Vercel production env (DATABASE_URL, OPENAI_API_KEY, …)
$envFile = Join-Path $root ".env.vercel"
if (-not (Test-Path $envFile)) {
  Write-Host "Pulling Vercel production env..."
  Push-Location (Join-Path $root "apps\web")
  npx vercel env pull $envFile --environment=production --yes
  if ($LASTEXITCODE -ne 0) { throw "vercel env pull failed" }
  Pop-Location
}

Write-Host "Syncing variables to Railway..."
powershell -File (Join-Path $root "scripts\sync-railway-env.ps1")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Redeploy complete. Check Railway logs for:"
Write-Host "  [worker] OpenAI images: configured"
Write-Host "  [worker] Postgres queue"
