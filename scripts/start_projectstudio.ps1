param(
  [ValidateSet('Auto','Dev','Installed')]
  [string]$Mode = 'Auto'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$releaseExecutable = Join-Path $root 'src-tauri\target\release\projectstudio.exe'
$debugExecutable = Join-Path $root 'src-tauri\target\debug\projectstudio.exe'
$runtimeRoot = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies'
$pnpm = Join-Path $runtimeRoot 'bin\fallback\pnpm.cmd'
$nodeBin = Join-Path $runtimeRoot 'node\bin'

function Get-ProjectStudioProcess {
  Get-Process projectstudio -ErrorAction SilentlyContinue
}

function Stop-ProjectStudioDevelopmentServer {
  $listeners = Get-NetTCPConnection -LocalPort 1420 -State Listen -ErrorAction SilentlyContinue
  foreach ($listener in $listeners) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)" -ErrorAction SilentlyContinue
    if (-not $process) {
      continue
    }
    $commandLine = [string]$process.CommandLine
    if ($commandLine -notlike "*$root*" -or $commandLine -notmatch 'vite|tauri|pnpm') {
      throw "포트 1420을 다른 프로그램이 사용 중입니다. PID $($listener.OwningProcess): $($process.Name)"
    }
    Stop-Process -Id $listener.OwningProcess -Force -ErrorAction Stop
  }
}

function Start-DevelopmentMode {
  Get-ProjectStudioProcess | Stop-Process -Force -ErrorAction SilentlyContinue
  Stop-ProjectStudioDevelopmentServer
  if (-not (Test-Path -LiteralPath $pnpm)) {
    throw "Bundled pnpm을 찾지 못했습니다: $pnpm"
  }
  $env:PATH = "$nodeBin;$(Split-Path -Parent $pnpm);$env:PATH"
  $stdout = Join-Path $env:TEMP 'projectstudio-dev.log'
  $stderr = Join-Path $env:TEMP 'projectstudio-dev-error.log'
  Start-Process -FilePath $pnpm -ArgumentList @('tauri','dev') -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr
  Write-Output "DEV:$pnpm tauri dev"
}

$running = Get-ProjectStudioProcess
if ($Mode -eq 'Dev') {
  Start-DevelopmentMode
  exit
}

if ($running) {
  $shell = New-Object -ComObject WScript.Shell
  $null = $shell.AppActivate($running[0].Id)
  Write-Output "REUSED:$($running[0].Path)"
  exit
}

if (Test-Path -LiteralPath $releaseExecutable) {
  Start-Process -FilePath $releaseExecutable -WorkingDirectory $root
  Write-Output "RELEASE:$releaseExecutable"
  exit
}

if ($Mode -eq 'Installed') {
  throw '설치 또는 release 실행 파일을 찾지 못했습니다.'
}

if (Test-Path -LiteralPath $debugExecutable) {
  Start-Process -FilePath $debugExecutable -WorkingDirectory $root
  Write-Output "DEBUG:$debugExecutable"
  exit
}

Start-DevelopmentMode
