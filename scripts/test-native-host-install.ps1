# Actual HKCU lifecycle using only task-owned host copies. Does not launch cards.
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$SourceDirectory,[Parameter(Mandatory=$true)][string]$UpgradeDirectory)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$projectRoot=Split-Path -Parent $PSScriptRoot
$qaRoot=Join-Path (Join-Path $projectRoot 'build\native-installs') ([Guid]::NewGuid().ToString())
$manager=Join-Path $PSScriptRoot 'install-native-host.ps1'
$key='HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.heptafloat.bridge'
if(Test-Path -LiteralPath $key){throw 'Native host already registered. Run this isolated lifecycle before the permanent installation.'}
$source=(Resolve-Path -LiteralPath $SourceDirectory).Path
$upgrade=(Resolve-Path -LiteralPath $UpgradeDirectory).Path
$extensionId='a'*32
function Pointer {if(Test-Path -LiteralPath $key){return (Get-Item -LiteralPath $key).GetValue('')};return $null}
function Protocol {return (Get-Item -LiteralPath 'HKCU:\Software\Classes\flowhepta\shell\open\command').GetValue('')}
function Https {return (Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\https\UserChoice').ProgId}
function Run-Manager([string]$Mode,[string]$Source) {
  $arguments=@('-NoProfile','-File',$manager,'-Action',$Mode,'-InstallRoot',$qaRoot,'-ExtensionId',$extensionId)
  if($Source){$arguments+=@('-SourceDirectory',$Source)}
  & powershell.exe @arguments
  if($LASTEXITCODE -ne 0){throw "Native installation failed: $Mode"}
}
$protocolBefore=Protocol; $httpsBefore=Https
$result=[ordered]@{mode='actual-HKCU-native-host-lifecycle';install=$false;reinstall=$false;originChangeRejected=$false;foreignRootRejected=$false;upgrade=$false;rollback=$false;firstRollback=$false;uninstall=$false;nativeRegistrationRestored=$false;desktopProtocolUnchanged=$false;httpsUnchanged=$false;noteWrites=0}
try {
  Run-Manager 'Install' $source; $first=Pointer
  if(!$first -or !$first.StartsWith("$qaRoot\",[StringComparison]::OrdinalIgnoreCase)){throw 'Native manifest escaped task installation.'}
  $manifest=Get-Content -LiteralPath $first -Raw|ConvertFrom-Json
  if(@($manifest.allowed_origins).Count -ne 1 -or $manifest.allowed_origins[0] -ne "chrome-extension://$extensionId/"){throw 'Origin scope is too broad.'}
  $result.install=$true
  Run-Manager 'Install' $source; if((Pointer) -ne $first){throw 'Reinstall changed the pointer.'};$result.reinstall=$true
  $rejected=$false
  try{& powershell.exe -NoProfile -File $manager -Action Install -InstallRoot $qaRoot -SourceDirectory $source -ExtensionId ('b'*32) 2>$null;if($LASTEXITCODE -ne 0){$rejected=$true}}catch{$rejected=$true}
  if(!$rejected -or (Pointer) -ne $first){throw 'Origin change was not rejected.'};$result.originChangeRejected=$true
  $otherRoot=Join-Path $qaRoot 'unmanaged';$rejected=$false
  try{& powershell.exe -NoProfile -File $manager -Action Install -InstallRoot $otherRoot -SourceDirectory $source -ExtensionId $extensionId 2>$null;if($LASTEXITCODE -ne 0){$rejected=$true}}catch{$rejected=$true}
  if(!$rejected -or (Pointer) -ne $first -or (Test-Path -LiteralPath $otherRoot)){throw 'Foreign registration was changed.'};$result.foreignRootRejected=$true
  Run-Manager 'Install' $upgrade; if((Pointer) -eq $first){throw 'Upgrade did not change versions.'};$result.upgrade=$true
  Run-Manager 'Rollback' '';if((Pointer) -ne $first){throw 'Rollback did not restore the first version.'};$result.rollback=$true
  Run-Manager 'Uninstall' '';if(Test-Path -LiteralPath $key){throw 'Native key retained after uninstall.'};$result.uninstall=$true
  Run-Manager 'Install' $source;Run-Manager 'Rollback' ''
  if((Pointer) -or !(Test-Path -LiteralPath $first)){throw 'First rollback should unregister and retain the owned files.'};$result.firstRollback=$true
  Run-Manager 'Uninstall' ''
} finally {
  $receiptFile=Join-Path $qaRoot 'native-install-state.json'
  if(Test-Path -LiteralPath $receiptFile){$receipt=Get-Content -LiteralPath $receiptFile -Raw|ConvertFrom-Json;if($receipt.installed -or @($receipt.versions).Count){Run-Manager 'Uninstall' ''}}
  $result.nativeRegistrationRestored=!(Test-Path -LiteralPath $key)
  $result.desktopProtocolUnchanged=(Protocol) -eq $protocolBefore
  $result.httpsUnchanged=(Https) -eq $httpsBefore
  $result|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $projectRoot 'build\native-host-install-lifecycle.json') -Encoding UTF8
}
if(!$result.nativeRegistrationRestored -or !$result.desktopProtocolUnchanged -or !$result.httpsUnchanged){throw 'A registration was not restored.'}
$result|ConvertTo-Json
