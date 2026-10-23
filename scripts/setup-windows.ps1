param([switch]$Package)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if ($env:OS -ne 'Windows_NT') { throw 'This setup script requires Windows.' }
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'package.json'))) { throw 'Project package.json is missing.' }
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { throw 'Install Node.js 22 or newer, then run this script again.' }
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'npm is missing from PATH.' }
$major = [int]((node.exe --version).TrimStart('v').Split('.')[0])
if ($major -lt 22) { throw 'Node.js 22 or newer is required.' }
# Installs only project dependencies; does not alter Heptabase, PATH, services, or login settings.
Push-Location $projectRoot
try {
    npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
    npm.cmd test
    if ($LASTEXITCODE -ne 0) { throw 'Tests failed.' }
    npm.cmd run test:windows
    if ($LASTEXITCODE -ne 0) { throw 'Windows smoke test failed.' }
    if ($Package) {
        npm.cmd run package:windows
        if ($LASTEXITCODE -ne 0) { throw 'Packaging failed.' }
    }
    Write-Host 'Ready. Run npm.cmd run start:windows to open HeptaFloat.'
} finally { Pop-Location }
