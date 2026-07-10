param(
    [ValidateSet("Auto", "Installed", "Dev")]
    [string]$Mode = "Auto"
)

$ErrorActionPreference = "Stop"
$repo = "C:\Users\Kim Beom soo\OneDrive\Documents\ProjectStudio"
$process = Get-Process -Name "projectstudio" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($process) { Write-Output "running:$($process.Id)"; exit 0 }

$installedCandidates = @(
    (Join-Path $env:LOCALAPPDATA "ProjectStudio\projectstudio.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\ProjectStudio\projectstudio.exe"),
    (Join-Path $repo "src-tauri\target\release\projectstudio.exe")
)

if ($Mode -ne "Dev") {
    $executable = $installedCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if ($executable) { Start-Process -FilePath $executable; Write-Output "started:$executable"; exit 0 }
    if ($Mode -eq "Installed") { throw "ProjectStudio 설치 또는 릴리스 실행 파일을 찾지 못했습니다." }
}

if (-not (Test-Path -LiteralPath $repo)) { throw "ProjectStudio 저장소를 찾지 못했습니다: $repo" }
$bundledPnpm = "C:\Users\Kim Beom soo\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"
$pnpm = if (Get-Command pnpm -ErrorAction SilentlyContinue) { "pnpm" } elseif (Test-Path -LiteralPath $bundledPnpm) { $bundledPnpm } else { $null }
if (-not $pnpm) { throw "pnpm을 찾지 못했습니다. Codex 번들 런타임 또는 pnpm 설치가 필요합니다." }

$command = "Set-Location -LiteralPath '$($repo.Replace("'", "''"))'; & '$($pnpm.Replace("'", "''"))' tauri dev"
Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoProfile", "-Command", $command) -WindowStyle Hidden
Write-Output "started-dev:$repo"
