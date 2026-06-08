# Sync production env vars from local files to Railway worker.
# Prereq: railway login  (or set RAILWAY_TOKEN / RAILWAY_API_TOKEN)
#
# Usage:
#   cd "c:\cursor\reels factory"
#   npx railway login
#   npx railway link          # pick reelsfactory worker service
#   powershell -File scripts/sync-railway-env.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

function Read-DotEnvValue([string]$file, [string]$key) {
  if (-not (Test-Path $file)) { return $null }
  foreach ($line in Get-Content $file) {
    if ($line -match "^\s*$key\s*=\s*(.+)\s*$") {
      $v = $Matches[1].Trim()
      if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length - 2) }
      if ($v.StartsWith("'") -and $v.EndsWith("'")) { $v = $v.Substring(1, $v.Length - 2) }
      if ($v) { return $v }
    }
  }
  return $null
}

Write-Host "Checking Railway CLI auth..."
$whoami = npx railway whoami 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "Not logged in. Run: npx railway login"
  exit 1
}
Write-Host $whoami

$sources = @(
  (Join-Path $root ".env.vercel"),
  (Join-Path $root ".env"),
  (Join-Path $root "apps\worker\.env")
)

$databaseUrl = $null
foreach ($src in $sources) {
  $databaseUrl = Read-DotEnvValue $src "DATABASE_URL"
  if ($databaseUrl -and $databaseUrl -notmatch "localhost") { break }
}

if (-not $databaseUrl) {
  Write-Host "DATABASE_URL not found (need Neon URL in .env.vercel or pass manually)."
  exit 1
}

$vars = [ordered]@{
  DATABASE_URL     = $databaseUrl
  QUEUE_MODE       = "postgres"
  RENDER_ENGINE    = "ffmpeg"
  PLAYWRIGHT_PARSER = "true"
}

foreach ($key in @("OPENAI_API_KEY", "TAVILY_API_KEY", "S3_ENDPOINT", "S3_REGION", "S3_BUCKET", "S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_PUBLIC_URL")) {
  foreach ($src in $sources) {
    $val = Read-DotEnvValue $src $key
    if ($val) { $vars[$key] = $val; break }
  }
}

$setArgs = @()
foreach ($kv in $vars.GetEnumerator()) {
  if ($kv.Value) { $setArgs += "$($kv.Key)=$($kv.Value)" }
}

Write-Host "Setting $($setArgs.Count) variables on Railway..."
npx railway variable set @setArgs
if ($LASTEXITCODE -ne 0) {
  Write-Host "Failed to set variables."
  exit 1
}

Write-Host "Done. Redeploying worker..."
npx railway redeploy --yes
Write-Host "Check logs for: [worker] Postgres queue"
