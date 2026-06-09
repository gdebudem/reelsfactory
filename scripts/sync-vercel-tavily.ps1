# Sync TAVILY_API_KEY to Vercel (Production + Preview)
# Prereq: npx vercel login, project linked in apps/web
#
# Usage:
#   cd "c:\cursor\reels factory"
#   $env:TAVILY_API_KEY = "tvly-..."   # or add to .env
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
  exit 1
}

Push-Location $webDir
try {
  Write-Host "Setting TAVILY_API_KEY on Vercel (production)..."
  $key | npx vercel env add TAVILY_API_KEY production
  if ($LASTEXITCODE -ne 0) {
    Write-Host "If variable exists, remove it first: npx vercel env rm TAVILY_API_KEY production"
    exit 1
  }
  Write-Host "Setting TAVILY_API_KEY on Vercel (preview)..."
  $key | npx vercel env add TAVILY_API_KEY preview
  Write-Host "Done. Redeploy Vercel (git push or vercel --prod) for changes to apply."
  Write-Host "Check: https://web-omega-ochre-29.vercel.app/api/health -> tavilyMode: api_key"
}
finally {
  Pop-Location
}
