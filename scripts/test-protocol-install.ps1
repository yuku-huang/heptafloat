# Exercises only task-owned package copies. Restores the previous flowhepta
# association in finally; never closes the user's running app or touches notes.
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$SourceDirectory, [string]$UpgradeDirectory)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$projectRoot = Split-Path -Parent $PSScriptRoot
$qaParent = [IO.Path]::GetFullPath((Join-Path $projectRoot 'build\protocol-installs'))
$qaRoot = Join-Path $qaParent ([Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $qaRoot -Force | Out-Null
$manager = Join-Path $PSScriptRoot 'install-windows.ps1'
$commandKey = 'HKCU:\Software\Classes\flowhepta\shell\open\command'
function CurrentCommand { if(Test-Path -LiteralPath $commandKey){ (Get-Item -LiteralPath $commandKey).GetValue('') } }
function HttpsDefault { (Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\https\UserChoice').ProgId }
function Run-Manager([string]$Mode, [string]$Source) {
  $arguments = @('-NoProfile','-ExecutionPolicy','Bypass','-File',$manager,'-Action',$Mode,'-InstallRoot',$qaRoot)
  if($Source){ $arguments += @('-SourceDirectory', $Source) }
  & powershell.exe @arguments
  if($LASTEXITCODE -ne 0){ throw "Installer QA failed: $Mode" }
}
$before = CurrentCommand
$httpsBefore = HttpsDefault
$result = [ordered]@{ mode='actual-HKCU-install-lifecycle'; install=$false; reinstall=$false; upgrade=$false; rollback=$false; uninstall=$false; priorAssociationRestored=$false; httpsUnchanged=$false; noteWrites=0 }
try {
  Run-Manager 'Install' (Resolve-Path -LiteralPath $SourceDirectory).Path
  $installed = CurrentCommand
  if(!$installed -or !$installed.Contains($qaRoot)){ throw 'Handler did not point to the QA installation.' }
  $result.install = $true
  Run-Manager 'Install' (Resolve-Path -LiteralPath $SourceDirectory).Path
  if((CurrentCommand) -ne $installed){ throw 'Reinstall was not idempotent.' }
  $result.reinstall = $true
  if($UpgradeDirectory){
    Run-Manager 'Install' (Resolve-Path -LiteralPath $UpgradeDirectory).Path
    if((CurrentCommand) -eq $installed){ throw 'Upgrade did not change the versioned handler.' }
    $result.upgrade = $true
  }
  Run-Manager 'Rollback' ''
  $expected = if($UpgradeDirectory){ $installed } else { $before }
  if((CurrentCommand) -ne $expected){ throw 'Rollback did not restore the expected association.' }
  $result.rollback = $true
  Run-Manager 'Uninstall' ''
  $receipt = Get-Content -LiteralPath (Join-Path $qaRoot 'install-state.json') -Raw | ConvertFrom-Json
  if($receipt.installed -or @($receipt.versions).Count){ throw 'Uninstall receipt was not cleared.' }
  $result.uninstall = $true
} finally {
  $receiptFile = Join-Path $qaRoot 'install-state.json'
  if(Test-Path -LiteralPath $receiptFile){
    $receipt = Get-Content -LiteralPath $receiptFile -Raw | ConvertFrom-Json
    if($receipt.installed -or @($receipt.versions).Count){ Run-Manager 'Uninstall' '' }
  }
  $result.priorAssociationRestored = (CurrentCommand) -eq $before
  $result.httpsUnchanged = (HttpsDefault) -eq $httpsBefore
  $reportName = if($UpgradeDirectory){ 'windows-install-lifecycle-upgrade.json' } else { 'windows-install-lifecycle-first.json' }
  $result | ConvertTo-Json | Set-Content -LiteralPath (Join-Path (Join-Path $projectRoot 'build') $reportName) -Encoding utf8
}
if(!$result.priorAssociationRestored -or !$result.httpsUnchanged){ throw 'An association was not restored.' }
$result | ConvertTo-Json
