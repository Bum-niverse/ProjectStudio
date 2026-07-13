param(
    [Parameter(Mandatory = $true)]
    [string]$Target
)

$ErrorActionPreference = "Stop"
$Source = Split-Path -Parent $PSScriptRoot
$TargetPath = (Resolve-Path -LiteralPath $Target).Path
$SourcePath = (Resolve-Path -LiteralPath $Source).Path

if ($TargetPath -eq $SourcePath -or $TargetPath.StartsWith($SourcePath + [IO.Path]::DirectorySeparatorChar)) {
    throw "Target must not be the harness source or its child directory."
}

$RelativeFiles = Get-ChildItem -LiteralPath $Source -Recurse -File | Where-Object {
    $_.FullName -notmatch '[\\/]\.git[\\/]' -and
    $_.Name -notin @('CUSTOM_INSTRUCTIONS.txt', 'CODEX_APPLY_INSTRUCTIONS.md')
} | ForEach-Object { [IO.Path]::GetRelativePath($SourcePath, $_.FullName) }

$Conflicts = @($RelativeFiles | Where-Object { Test-Path -LiteralPath (Join-Path $TargetPath $_) })
if ($Conflicts.Count -gt 0) {
    Write-Host "Existing files were not overwritten:" -ForegroundColor Yellow
    $Conflicts | ForEach-Object { Write-Host "  $_" }
    Write-Host "Ask Codex to inspect and merge these files before copying the remaining harness files."
}

foreach ($RelativeFile in $RelativeFiles) {
    $Destination = Join-Path $TargetPath $RelativeFile
    if (Test-Path -LiteralPath $Destination) {
        continue
    }
    $DestinationDirectory = Split-Path -Parent $Destination
    New-Item -ItemType Directory -Force -Path $DestinationDirectory | Out-Null
    Copy-Item -LiteralPath (Join-Path $SourcePath $RelativeFile) -Destination $Destination
}

Write-Host "Harness files copied without overwriting existing files."
Write-Host "Next: ask Codex to merge project rules and configure validation commands and CI."
