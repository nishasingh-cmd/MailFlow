# MailFlow Cloudflare Tunnel - v5 (Final)
# FIX 1: Frontend uses https://localhost:5173 --no-tls-verify  (Vite runs HTTPS via mkcert)
# FIX 2: Direct Start-Process with RedirectStandardError (no batch files, no buffering)
# FIX 3: Watchdog auto-restarts dead tunnels

$ScriptDir        = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot      = Split-Path -Parent $ScriptDir
$FrontendEnvLocal = Join-Path $ProjectRoot "frontend\.env.local"

# ─── Find cloudflared ───────────────────────────────────────────────────────
$CF = $null
$cfCmd = Get-Command "cloudflared" -ErrorAction SilentlyContinue
foreach ($p in @(
    "C:\Program Files (x86)\cloudflared\cloudflared.exe",
    "C:\Program Files\Cloudflare\cloudflared\cloudflared.exe",
    "C:\Program Files\cloudflared\cloudflared.exe",
    "C:\Windows\System32\cloudflared.exe",
    $(if ($cfCmd) { $cfCmd.Source } else { "" })
)) { if ($p -and (Test-Path $p)) { $CF = $p; break } }

if (-not $CF) { Write-Host "ERROR: cloudflared.exe not found!" -ForegroundColor Red; exit 1 }

# ─── Header ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "        MailFlow  --  Cloudflare Tunnel  v5           " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Binary : $CF" -ForegroundColor DarkGray
Write-Host "  FE URL : https://localhost:5173 (HTTPS + --no-tls-verify)" -ForegroundColor DarkGray
Write-Host "  BE URL : http://localhost:3001" -ForegroundColor DarkGray
Write-Host ""

# ─── Log files ───────────────────────────────────────────────────────────────
$feOut = "$env:TEMP\mf-fe-out.log"; $feErr = "$env:TEMP\mf-fe-err.log"
$beOut = "$env:TEMP\mf-be-out.log"; $beErr = "$env:TEMP\mf-be-err.log"
foreach ($f in @($feOut,$feErr,$beOut,$beErr)) { "" | Set-Content $f -Encoding ASCII }

# ─── Kill stale cloudflared ─────────────────────────────────────────────────
Write-Host "  Killing any existing cloudflared processes..." -ForegroundColor DarkGray
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 800

# ─── Launch tunnels ───────────────────────────────────────────────────────────
Write-Host "[1/2] Frontend tunnel  ->  https://localhost:5173" -ForegroundColor Yellow
$feProc = Start-Process -FilePath $CF `
    -ArgumentList @("tunnel","--url","https://localhost:5173","--no-tls-verify") `
    -RedirectStandardOutput $feOut `
    -RedirectStandardError  $feErr `
    -NoNewWindow -PassThru

Write-Host "[2/2] Backend  tunnel  ->  http://localhost:3001" -ForegroundColor Yellow
$beProc = Start-Process -FilePath $CF `
    -ArgumentList @("tunnel","--url","http://localhost:3001") `
    -RedirectStandardOutput $beOut `
    -RedirectStandardError  $beErr `
    -NoNewWindow -PassThru

Write-Host ""
Write-Host "  Waiting for Cloudflare URLs (up to 45s)..." -ForegroundColor DarkGray

# ─── URL detection loop ───────────────────────────────────────────────────────
$feUrl = $null; $beUrl = $null; $elapsed = 0
while (($null -eq $feUrl -or $null -eq $beUrl) -and $elapsed -lt 45) {
    Start-Sleep -Seconds 1; $elapsed++

    foreach ($log in @($feOut,$feErr)) {
        if ($null -eq $feUrl -and (Test-Path $log)) {
            $t = Get-Content $log -Raw -ErrorAction SilentlyContinue
            if ($t -match 'https://[a-z0-9\-]+\.trycloudflare\.com') { $feUrl = $Matches[0] }
        }
    }
    foreach ($log in @($beOut,$beErr)) {
        if ($null -eq $beUrl -and (Test-Path $log)) {
            $t = Get-Content $log -Raw -ErrorAction SilentlyContinue
            if ($t -match 'https://[a-z0-9\-]+\.trycloudflare\.com') { $beUrl = $Matches[0] }
        }
    }

    if ($elapsed % 5 -eq 0) {
        $fs = if ($feUrl) { "FE: READY " } else { "FE: waiting..." }
        $bs = if ($beUrl) { "BE: READY" } else { "BE: waiting..." }
        Write-Host "  [$elapsed s]  $fs   $bs" -ForegroundColor DarkGray
    }
}

# ─── Debug dump if URL not found ─────────────────────────────────────────────
if ($null -eq $feUrl) {
    Write-Host ""
    Write-Host "  [DEBUG] Frontend stderr:" -ForegroundColor Magenta
    Get-Content $feErr -ErrorAction SilentlyContinue | Select-Object -First 12 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
}
if ($null -eq $beUrl) {
    Write-Host ""
    Write-Host "  [DEBUG] Backend stderr:" -ForegroundColor Magenta
    Get-Content $beErr -ErrorAction SilentlyContinue | Select-Object -First 12 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
}

# ─── Update .env.local ───────────────────────────────────────────────────────
if ($beUrl) {
    Set-Content -Path $FrontendEnvLocal -Value "VITE_API_BASE_URL=$beUrl/api" -Encoding UTF8
}

# ─── Print results ───────────────────────────────────────────────────────────
Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "   MAILFLOW LIVE URLS  --  SEND TO YOUR CLIENT        " -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""

if ($feUrl) {
    Write-Host "  FRONTEND  >>  " -NoNewline -ForegroundColor White
    Write-Host $feUrl -ForegroundColor Cyan
} else {
    Write-Host "  FRONTEND : URL not detected (see DEBUG above)" -ForegroundColor Red
}
if ($beUrl) {
    Write-Host "  BACKEND   >>  " -NoNewline -ForegroundColor White
    Write-Host "$beUrl/api" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  [OK] .env.local  =>  VITE_API_BASE_URL=$beUrl/api" -ForegroundColor DarkGreen
    Write-Host "  [!]  Run:  npm run restart:frontend" -ForegroundColor DarkYellow
} else {
    Write-Host "  BACKEND  : URL not detected (see DEBUG above)" -ForegroundColor Red
}

Write-Host ""
Write-Host "  Tunnels ALIVE. Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""

# ─── Watchdog ────────────────────────────────────────────────────────────────
function Restart-Tunnel {
    param($proc, $args, $out, $err)
    if ($proc.HasExited) {
        Write-Host "  [WARN] Tunnel (PID $($proc.Id)) died - restarting..." -ForegroundColor DarkYellow
        return Start-Process -FilePath $CF -ArgumentList $args `
            -RedirectStandardOutput $out -RedirectStandardError $err `
            -NoNewWindow -PassThru
    }
    return $proc
}

try {
    while ($true) {
        Start-Sleep -Seconds 30
        $feProc = Restart-Tunnel $feProc @("tunnel","--url","https://localhost:5173","--no-tls-verify") $feOut $feErr
        $beProc = Restart-Tunnel $beProc @("tunnel","--url","http://localhost:3001") $beOut $beErr
        Write-Host "  [$(Get-Date -Format 'HH:mm:ss')]  FE:$($feProc.Id)  BE:$($beProc.Id)  -- alive" -ForegroundColor DarkGray
    }
} finally {
    Write-Host ""
    Write-Host "  Stopping tunnels..." -ForegroundColor Yellow
    $feProc | Stop-Process -Force -ErrorAction SilentlyContinue
    $beProc | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force
    Set-Content -Path $FrontendEnvLocal -Value "VITE_API_BASE_URL=http://localhost:3001/api" -Encoding UTF8
    Write-Host "  Done. .env.local restored to localhost." -ForegroundColor Red
    Write-Host ""
}
