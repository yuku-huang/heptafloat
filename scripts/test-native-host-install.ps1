# Actual HKCU lifecycle using only task-owned host copies. Does not launch cards.
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$SourceDirectory,[Parameter(Mandatory=$true)][string]$UpgradeDirectory)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$projectRoot=Split-Path -Parent $PSScriptRoot
$qaRoot=Join-Path (Join-Path $projectRoot 'build\native-installs') ([Guid]::NewGuid().ToString())
$manager=Join-Path $PSScriptRoot 'install-native-host.ps1'
$key='HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.heptafloat.bridge'
$fallbackKey='HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.heptafloat.bridge'
if((Test-Path -LiteralPath $key) -or (Test-Path -LiteralPath $fallbackKey)){throw 'Native host already registered. Run this isolated lifecycle before the permanent installation.'}
$source=(Resolve-Path -LiteralPath $SourceDirectory).Path
$upgrade=(Resolve-Path -LiteralPath $UpgradeDirectory).Path
$extensionId='a'*32
function Pointer {if(Test-Path -LiteralPath $key){return (Get-Item -LiteralPath $key).GetValue('')};return $null}
function Fallback-Pointer {if(Test-Path -LiteralPath $fallbackKey){return (Get-Item -LiteralPath $fallbackKey).GetValue('')};return $null}
function Assert-Pair([string]$Expected){if($Expected){if((Pointer) -ne $Expected -or (Fallback-Pointer) -ne $Expected){throw 'Primary and Edge fallback pointers diverged.'}}elseif((Pointer) -or (Fallback-Pointer)){throw 'A native pointer was retained.'}}
function Protocol {return (Get-Item -LiteralPath 'HKCU:\Software\Classes\flowhepta\shell\open\command').GetValue('')}
function Https {return (Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\https\UserChoice').ProgId}
function Run-Manager([string]$Mode,[string]$Source) {
  $arguments=@('-NoProfile','-File',$manager,'-Action',$Mode,'-InstallRoot',$qaRoot,'-ExtensionId',$extensionId)
  if($Source){$arguments+=@('-SourceDirectory',$Source)}
  & powershell.exe @arguments
  if($LASTEXITCODE -ne 0){throw "Native installation failed: $Mode"}
}
$protocolBefore=Protocol; $httpsBefore=Https
$result=[ordered]@{mode='actual-HKCU-native-host-lifecycle';install=$false;reinstall=$false;originChangeRejected=$false;foreignRootRejected=$false;foreignFallbackRejected=$false;legacyReceiptMigrated=$false;changedFallbackRejected=$false;fallbackSynchronized=$false;upgrade=$false;rollback=$false;firstRollback=$false;uninstall=$false;nativeRegistrationRestored=$false;desktopProtocolUnchanged=$false;httpsUnchanged=$false;noteWrites=0}
try {
  $foreign=Join-Path $qaRoot 'unmanaged-native.json'
  New-Item -Path $fallbackKey -Force|Out-Null;Set-Item -LiteralPath $fallbackKey -Value $foreign
  try{
    $rejected=$false
    try{& powershell.exe -NoProfile -File $manager -Action Install -InstallRoot $qaRoot -SourceDirectory $source -ExtensionId $extensionId 2>$null;if($LASTEXITCODE -ne 0){$rejected=$true}}catch{$rejected=$true}
    if(!$rejected -or (Pointer) -or (Fallback-Pointer) -ne $foreign -or (Test-Path -LiteralPath $qaRoot)){throw 'Unknown fallback was changed or partially installed.'}
    $result.foreignFallbackRejected=$true
  }finally{if((Fallback-Pointer) -eq $foreign){Remove-Item -LiteralPath $fallbackKey}}
  Run-Manager 'Install' $source; $first=Pointer
  Assert-Pair $first
  if(!$first -or !$first.StartsWith("$qaRoot\",[StringComparison]::OrdinalIgnoreCase)){throw 'Native manifest escaped task installation.'}
  $manifest=Get-Content -LiteralPath $first -Raw|ConvertFrom-Json
  if(@($manifest.allowed_origins).Count -ne 1 -or $manifest.allowed_origins[0] -ne "chrome-extension://$extensionId/"){throw 'Origin scope is too broad.'}
  $result.install=$true
  Run-Manager 'Install' $source;Assert-Pair $first;$result.reinstall=$true
  $legacyFile=Join-Path $qaRoot 'native-install-state.json'
  $legacy=Get-Content -LiteralPath $legacyFile -Raw|ConvertFrom-Json
  $legacy.PSObject.Properties.Remove('registryKeys')
  [IO.File]::WriteAllText($legacyFile,($legacy|ConvertTo-Json -Depth 5),[Text.UTF8Encoding]::new($false))
  Remove-Item -LiteralPath $fallbackKey
  Run-Manager 'Install' $source;Assert-Pair $first;$result.legacyReceiptMigrated=$true
  Set-Item -LiteralPath $fallbackKey -Value $foreign
  try{
    $rejected=$false
    try{& powershell.exe -NoProfile -File $manager -Action Install -InstallRoot $qaRoot -SourceDirectory $source -ExtensionId $extensionId 2>$null;if($LASTEXITCODE -ne 0){$rejected=$true}}catch{$rejected=$true}
    if(!$rejected -or (Pointer) -ne $first -or (Fallback-Pointer) -ne $foreign){throw 'Changed fallback was overwritten.'};$result.changedFallbackRejected=$true
  }finally{if((Fallback-Pointer) -eq $foreign){Set-Item -LiteralPath $fallbackKey -Value $first}}
  $rejected=$false
  try{& powershell.exe -NoProfile -File $manager -Action Install -InstallRoot $qaRoot -SourceDirectory $source -ExtensionId ('b'*32) 2>$null;if($LASTEXITCODE -ne 0){$rejected=$true}}catch{$rejected=$true}
  if(!$rejected){throw 'Origin change was not rejected.'};Assert-Pair $first;$result.originChangeRejected=$true
  $otherRoot=Join-Path $qaRoot 'unmanaged';$rejected=$false
  try{& powershell.exe -NoProfile -File $manager -Action Install -InstallRoot $otherRoot -SourceDirectory $source -ExtensionId $extensionId 2>$null;if($LASTEXITCODE -ne 0){$rejected=$true}}catch{$rejected=$true}
  if(!$rejected -or (Test-Path -LiteralPath $otherRoot)){throw 'Foreign registration was changed.'};Assert-Pair $first;$result.foreignRootRejected=$true
  Run-Manager 'Install' $upgrade; if((Pointer) -eq $first){throw 'Upgrade did not change versions.'};Assert-Pair (Pointer);$result.upgrade=$true
  Run-Manager 'Rollback' '';Assert-Pair $first;$result.rollback=$true
  Run-Manager 'Uninstall' '';Assert-Pair '';$result.uninstall=$true
  Run-Manager 'Install' $source;Run-Manager 'Rollback' ''
  Assert-Pair '';if(!(Test-Path -LiteralPath $first)){throw 'First rollback should retain the owned files.'};$result.firstRollback=$true
  Run-Manager 'Uninstall' ''
  $result.fallbackSynchronized=$true
} finally {
  $receiptFile=Join-Path $qaRoot 'native-install-state.json'
  if(Test-Path -LiteralPath $receiptFile){$receipt=Get-Content -LiteralPath $receiptFile -Raw|ConvertFrom-Json;if($receipt.installed -or @($receipt.versions).Count){Run-Manager 'Uninstall' ''}}
  $result.nativeRegistrationRestored=!(Test-Path -LiteralPath $key) -and !(Test-Path -LiteralPath $fallbackKey)
  $result.desktopProtocolUnchanged=(Protocol) -eq $protocolBefore
  $result.httpsUnchanged=(Https) -eq $httpsBefore
  $result|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $projectRoot 'build\native-host-install-lifecycle.json') -Encoding UTF8
}
if(!$result.nativeRegistrationRestored -or !$result.desktopProtocolUnchanged -or !$result.httpsUnchanged){throw 'A registration was not restored.'}
$result|ConvertTo-Json
