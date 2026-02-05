<#
.SYNOPSIS
    Copy filtered sushi data to the React Native app.
#>

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

$SourceFile = Join-Path $ProjectRoot "data\out\sushi_tokyo_filtered.geojson"
$DestFile = Join-Path $ProjectRoot "src\data\tokyo_sushi.json"

if (-not (Test-Path $SourceFile)) {
    Write-Host "Source file not found: $SourceFile" -ForegroundColor Red
    Write-Host "Run 'python scripts\filter_tokyo.py' first." -ForegroundColor Yellow
    exit 1
}

Copy-Item -Path $SourceFile -Destination $DestFile -Force
Write-Host "Copied sushi data to app!" -ForegroundColor Green
Write-Host "  From: $SourceFile"
Write-Host "  To:   $DestFile"

$content = Get-Content $DestFile -Raw | ConvertFrom-Json
Write-Host "  Features: $($content.features.Count)" -ForegroundColor Cyan
