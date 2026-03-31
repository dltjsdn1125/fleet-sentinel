# FleetSentinel 로컬 준비
#   기본: Node 종료 → npm install → Docker Postgres → prisma db push → .next 정리
#   Supabase 전용:  .\scripts\bootstrap.ps1 -Supabase   또는   npm run bootstrap:supabase
param(
  [switch]$Supabase
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "==> Node 프로세스 종료 (Prisma DLL 잠금 해제)"
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "==> npm install"
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($Supabase) {
  Write-Host ""
  Write-Host "==> Supabase 모드: Docker 생략 (.env / .env.local 의 FLEET_DATABASE_URL 사용)" -ForegroundColor Cyan
  Write-Host "==> prisma db push"
  npx prisma db push
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "==> prisma seed (데모 계정 admin@demo.com / demo1234)"
  npm run db:seed
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "==> .next 삭제 (RSC dev/prod 섞임 방지)"
  if (Test-Path .next) { Remove-Item -Recurse -Force .next }

  Write-Host ""
  Write-Host "완료. NEXTAUTH_URL / AUTH_URL 이 http://localhost:3010 인지 확인 후: npm run dev" -ForegroundColor Green
  exit 0
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host ""
  Write-Host "[안내] docker 명령을 찾을 수 없습니다." -ForegroundColor Yellow
  Write-Host "  Supabase 만 쓰는 경우: npm run bootstrap:supabase  (FLEET_DATABASE_URL 을 Supabase URI 로 설정)" -ForegroundColor Yellow
  exit 2
}

Write-Host "==> docker compose up -d"
docker compose up -d
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Postgres 준비 대기 (최대 60초)"
$ok = $false
for ($i = 0; $i -lt 20; $i++) {
  docker compose exec -T db pg_isready -U postgres -d fleetsentinel 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $ok = $true; break }
  Start-Sleep -Seconds 3
}
if (-not $ok) {
  Write-Host "[오류] Postgres 가 준비되지 않았습니다. docker compose logs db 확인" -ForegroundColor Red
  exit 3
}

Write-Host "==> prisma db push"
npx prisma db push
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> .next 삭제 (RSC dev/prod 섞임 방지)"
if (Test-Path .next) { Remove-Item -Recurse -Force .next }

Write-Host ""
Write-Host "완료. 다음: npm run dev  (http://localhost:3010)" -ForegroundColor Green
