# .env.local 의 FLEET_DATABASE_URL 을 Supabase Session pooler URI 로 설정합니다.
# 사용법:
#   1) 대화형:  npm run db:set-url
#   2) 일회성:  $env:SUPABASE_DB_PASSWORD="대시보드 DB 비밀번호"; npm run db:set-url
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env.local"
if (-not (Test-Path $envFile)) { throw ".env.local not found at $envFile" }

$plain = $env:SUPABASE_DB_PASSWORD
if (-not $plain) {
  $secure = Read-Host "Supabase Database password (Settings → Database)" -AsSecureString
  $BSTR = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($BSTR) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR) }
}
if (-not $plain) { throw "Password empty." }

$enc = [System.Uri]::EscapeDataString($plain)
$ref = "jnpxwcmshukhkxdzicwv"
$hostPool = "aws-0-ap-northeast-2.pooler.supabase.com"
$url = "postgresql://postgres.${ref}:${enc}@${hostPool}:5432/postgres"

$lines = Get-Content $envFile -Encoding UTF8
$done = $false
$out = foreach ($line in $lines) {
  if ($line -match '^\s*FLEET_DATABASE_URL=') {
    $done = $true
    "FLEET_DATABASE_URL=`"$url`""
  } else { $line }
}
if (-not $done) { throw "FLEET_DATABASE_URL line not found in .env.local" }
$out | Set-Content $envFile -Encoding UTF8
Write-Host "Updated FLEET_DATABASE_URL (project $ref, session pooler 5432)." -ForegroundColor Green
