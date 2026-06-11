# Sync S3/R2 env vars to Vercel (Production + Preview) for scene image proxy
# Prereq: npx vercel login, project linked in apps/web
#
# Usage:
#   cd "c:\cursor\reels factory"
#   powershell -File scripts/sync-vercel-storage.ps1
# Reads from .env, .env.vercel, or apps/web/.env.local (same keys as Railway worker)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$webDir = Join-Path $root "apps\web"

$keys = @(
  "S3_ENDPOINT",
  "S3_BUCKET",
  "S3_ACCESS_KEY",
  "S3_SECRET_KEY",
  "S3_PUBLIC_URL"
)

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

function Get-EnvValue([string]$key) {
  $v = [Environment]::GetEnvironmentVariable($key)
  if ($v) { return $v }
  foreach ($src in @(
    (Join-Path $root ".env"),
    (Join-Path $root ".env.vercel"),
    (Join-Path $root "apps\web\.env.local")
  )) {
    $v = Read-DotEnvValue $src $key
    if ($v) { return $v }
  }
  return $null
}

function Set-VercelEnv([string]$name, [string]$value, [string]$target) {
  Write-Host "Setting $name on Vercel ($target)..."
  $null = npx vercel env rm $name $target --yes 2>$null
  $value | npx vercel env add $name $target
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to set $name for $target (exit $LASTEXITCODE)"
  }
}

$values = @{}
foreach ($key in $keys) {
  $values[$key] = Get-EnvValue $key
}

$missing = $keys | Where-Object { -not $values[$_] }
if ($missing.Count -gt 0) {
  Write-Host "Missing env vars: $($missing -join ', ')"
  Write-Host "Copy S3_* from Railway worker or see R2_SETUP.md"
  exit 1
}

Push-Location $webDir
try {
  foreach ($key in $keys) {
    Set-VercelEnv $key $values[$key] "production"
    Set-VercelEnv $key $values[$key] "preview"
  }

  Write-Host "Done. Redeploy Vercel (git push) for changes to apply."
  Write-Host "Check: /api/health -> storageConfigured: true"
}
finally {
  Pop-Location
}
