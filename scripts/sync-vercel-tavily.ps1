# Sync TAVILY_API_KEY to Vercel (Production + Preview)
# Prereq: npx vercel login, project linked in apps/web
#
# Usage:
#   cd "c:\cursor\reels factory"
#   $env:TAVILY_API_KEY = "tvly-..."   # or add to apps/web/.env.local
#   powershell -File scripts/sync-vercel-tavily.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$webDir = Join-Path $root "apps\web"

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

function Set-VercelEnv([string]$name, [string]$value, [string]$target) {
  Write-Host "Setting $name on Vercel ($target)..."
  $null = npx vercel env rm $name $target --yes 2>$null
  $value | npx vercel env add $name $target
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to set $name for $target (exit $LASTEXITCODE)"
  }
}

$key = $env:TAVILY_API_KEY
if (-not $key) {
  foreach ($src in @(
    (Join-Path $root ".env"),
    (Join-Path $root ".env.vercel"),
    (Join-Path $root "apps\web\.env.local")
  )) {
    $key = Read-DotEnvValue $src "TAVILY_API_KEY"
    if ($key) { break }
  }
}

if (-not $key) {
  Write-Host "TAVILY_API_KEY not found."
  Write-Host "Get a free key: https://app.tavily.com"
  Write-Host "Then: `$env:TAVILY_API_KEY = 'tvly-...'; powershell -File scripts/sync-vercel-tavily.ps1"
  Write-Host ""
  Write-Host "Without a key, production uses Tavily keyless (default). Do NOT set TAVILY_KEYLESS=false."
  exit 1
}

Push-Location $webDir
try {
  Set-VercelEnv "TAVILY_API_KEY" $key "production"
  Set-VercelEnv "TAVILY_API_KEY" $key "preview"

  # Ensure keyless is not explicitly disabled on production
  $null = npx vercel env rm TAVILY_KEYLESS production --yes 2>$null
  $null = npx vercel env rm TAVILY_KEYLESS preview --yes 2>$null

  Write-Host "Done. Redeploy Vercel (git push) for changes to apply."
  Write-Host "Check: /api/health -> tavilyProductionReady: true, tavilyMode: api_key"
}
finally {
  Pop-Location
}
