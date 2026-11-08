# Per-user, on-demand native host only. Never changes browser policy or card data.
[CmdletBinding()]
param(
  [ValidateSet('Install','Status','Rollback','Uninstall')][string]$Action='Status',
  [ValidateSet('Edge','Chrome')][string]$Browser='Edge',
  [string]$ExtensionId,
  [string]$SourceDirectory,
  [string]$InstallRoot,
  [string]$AppInstallRoot
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$hostName='com.heptafloat.bridge'
if (!$InstallRoot) { $InstallRoot=Join-Path $env:LOCALAPPDATA "Programs\HeptaFloatNativeBridge\$Browser" }
function Safe-Path([string]$InputPath) {
  if (![IO.Path]::IsPathRooted($InputPath)) { throw 'An absolute local path is required.' }
  $full=[IO.Path]::GetFullPath($InputPath).TrimEnd('\')
  if ($full.StartsWith('\\') -or $full -eq [IO.Path]::GetPathRoot($full).TrimEnd('\')) { throw 'Network/device/drive-root paths are not allowed.' }
  $current=$full
  while ($current) {
    if ((Test-Path -LiteralPath $current) -and ((Get-Item -LiteralPath $current).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Linked installation paths are not allowed.' }
    $current=[IO.Path]::GetDirectoryName($current)
  }
  return $full
}
function Digest([string]$File) {
  $algorithm=[Security.Cryptography.SHA256]::Create(); $inputFile=[IO.File]::OpenRead($File)
  try { return [BitConverter]::ToString($algorithm.ComputeHash($inputFile)).Replace('-','').ToLowerInvariant() }
  finally { $inputFile.Dispose(); $algorithm.Dispose() }
}
function Write-Json([string]$File,$Value) { [IO.File]::WriteAllText($File,($Value|ConvertTo-Json -Depth 6),[Text.UTF8Encoding]::new($false)) }
$root=Safe-Path $InstallRoot
$stateFile=Join-Path $root 'native-install-state.json'
$key=if ($Browser -eq 'Edge') { "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$hostName" } else { "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName" }
$keys=@($key)
# Edge's documented Chrome fallback is required by the measured Windows/Edge installation.
# Both entries point to one immutable manifest and its one exact extension origin.
if($Browser -eq 'Edge'){$keys+=@("HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName")}
function Current-Manifest([string]$RegistryPath=$key) { if (Test-Path -LiteralPath $RegistryPath) { return (Get-Item -LiteralPath $RegistryPath).GetValue('') }; return $null }
function Version-Directory([string]$Version) {
  if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid native host version.' }
  $directory=Safe-Path (Join-Path $root $Version)
  if (!$directory.StartsWith("$root\",[StringComparison]::OrdinalIgnoreCase)) { throw 'Version directory escaped installation root.' }
  return $directory
}
function Manifest-Path([string]$Version) { return Join-Path (Version-Directory $Version) "$hostName.json" }
function Assert-NoHost {
  if (@(Get-Process -Name 'HeptaFloat.NativeHost' -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.StartsWith("$root\",[StringComparison]::OrdinalIgnoreCase) }).Count) { throw 'A native host is still running; try later. No process was stopped.' }
}
$receipt=$null
if (Test-Path -LiteralPath $stateFile) {
  $receipt=Get-Content -LiteralPath $stateFile -Raw|ConvertFrom-Json
  if ($receipt.owner -ne 'heptafloat-native-install-v1' -or $receipt.browser -ne $Browser) { throw 'Unknown installation receipt; nothing changed.' }
}
function Save-Receipt { Write-Json "$stateFile.tmp" $receipt; Move-Item -LiteralPath "$stateFile.tmp" -Destination $stateFile -Force }
function Receipt-Keys {
  if(!$receipt){return @()}
  # Older receipts owned only their primary key. Never silently adopt a fallback key.
  $owned=if($receipt.PSObject.Properties['registryKeys']){@($receipt.registryKeys)}else{@($key)}
  if(!@($owned).Count -or @($owned|Select-Object -Unique).Count -ne @($owned).Count -or $key -notin $owned -or @($owned|Where-Object{$_ -notin $keys}).Count){throw 'Invalid native registry ownership receipt.'}
  return $owned
}
function Assert-OwnedRegistration {
  if (!$receipt -or !$receipt.installed -or !@($receipt.versions).Count) { throw 'Native host registration changed; leaving it untouched.' }
  $expected=Manifest-Path @($receipt.versions)[-1]
  foreach($owned in @(Receipt-Keys)){if((Current-Manifest $owned) -ne $expected){throw 'Native host registration changed; leaving it untouched.'}}
}
function Commit-Pointers([string[]]$Targets,[string]$Manifest) {
  $before=@{};foreach($target in $Targets){$before[$target]=Current-Manifest $target}
  try{
    foreach($target in $Targets){New-Item -Path $target -Force|Out-Null;Set-Item -LiteralPath $target -Value $Manifest}
    Save-Receipt
  }catch{
    $failure=$_
    foreach($target in $Targets){if((Current-Manifest $target) -eq $Manifest){if($before[$target]){Set-Item -LiteralPath $target -Value $before[$target]}else{Remove-Item -LiteralPath $target}}}
    throw $failure
  }
}
function Remove-OwnedKey {
  Assert-OwnedRegistration
  $ownedKeys=@(Receipt-Keys)
  foreach($owned in $ownedKeys){
    $registry=Get-Item -LiteralPath $owned
    if ($registry.SubKeyCount -ne 0 -or @($registry.GetValueNames()).Count -ne 1) { throw 'Unexpected native host registry data; leaving it untouched.' }
  }
  $manifest=Current-Manifest;$removed=@()
  try{
    foreach($owned in $ownedKeys){Remove-Item -LiteralPath $owned;$removed+=@($owned)}
    $receipt.installed=$false;Save-Receipt
  }catch{
    $failure=$_
    foreach($owned in $removed){if(!(Test-Path -LiteralPath $owned)){New-Item -Path $owned -Force|Out-Null;Set-Item -LiteralPath $owned -Value $manifest}}
    throw $failure
  }
}
if ($Action -eq 'Status') {
  $allVersions=@(); if($receipt){$allVersions=@($receipt.versions)}
  $ownedKeys=@(Receipt-Keys)
  $registrations=@(foreach($target in $keys){[pscustomobject]@{key=$target;manifestPath=(Current-Manifest $target);owned=($null -ne $receipt -and $receipt.installed -and $target -in $ownedKeys)}})
  [pscustomobject]@{installed=($null -ne $receipt -and $receipt.installed);browser=$Browser;hostName=$hostName;manifestPath=(Current-Manifest);extensionId=$(if($receipt){$receipt.extensionId}else{$null});versions=$allVersions;registrations=$registrations}|ConvertTo-Json -Depth 4
  exit 0
}
if ($Action -eq 'Install') {
  $ownedKeys=@()
  if ($receipt -and $receipt.installed) { Assert-OwnedRegistration;$ownedKeys=@(Receipt-Keys) }
  foreach($target in $keys){if((Test-Path -LiteralPath $target) -and $target -notin $ownedKeys){throw 'A native host with this name is already registered without our active receipt. Nothing changed.'}}
  if (!$ExtensionId -and $receipt) { $ExtensionId=$receipt.extensionId }
  if ($ExtensionId -notmatch '^[a-p]{32}$') { throw 'Specify the actual 32-letter extension ID.' }
  if (!$AppInstallRoot) { $AppInstallRoot=if($receipt){$receipt.appInstallRoot}else{Join-Path $env:LOCALAPPDATA 'Programs\HeptaFloat'} }
  $appRoot=Safe-Path $AppInstallRoot
  $appReceipt=Get-Content -LiteralPath (Safe-Path (Join-Path $appRoot 'install-state.json')) -Raw|ConvertFrom-Json
  if ($appReceipt.owner -ne 'heptafloat-protocol-install-v1' -or !$appReceipt.installed -or !@($appReceipt.versions).Count) { throw 'A managed HeptaFloat desktop installation is required.' }
  $appVersion=@($appReceipt.versions)[-1]
  if ($appVersion -notmatch '^\d+\.\d+\.\d+-win\.\d+$') { throw 'Invalid desktop version.' }
  $appExe=Safe-Path (Join-Path (Join-Path $appRoot $appVersion) 'HeptaFloat.exe')
  if (!(Test-Path -LiteralPath $appExe -PathType Leaf) -or $appReceipt.command -ne ('"'+$appExe+'" "%1"')) { throw 'The desktop receipt/executable does not match.' }
  if ($receipt -and @($receipt.versions).Count -and ($receipt.extensionId -ne $ExtensionId -or $receipt.appInstallRoot -ne $appRoot)) { throw 'Changing the allowed origin or desktop root requires uninstalling this host first.' }
  if (!$SourceDirectory) {
    $SourceDirectory=Join-Path $PSScriptRoot '..\build\native-host\1.0.0'
    if (!(Test-Path -LiteralPath (Join-Path $SourceDirectory 'host-version.json'))) { $SourceDirectory=Join-Path $PSScriptRoot '..\native-host\1.0.0' }
  }
  $source=Safe-Path $SourceDirectory
  $metadata=Get-Content -LiteralPath (Join-Path $source 'host-version.json') -Raw|ConvertFrom-Json
  $version=[string]$metadata.version
  $directory=Version-Directory $version
  $sourceExe=Join-Path $source 'HeptaFloat.NativeHost.exe'
  if ((Digest $sourceExe) -ne $metadata.sha256 -or (Get-Item -LiteralPath $sourceExe).VersionInfo.FileVersion -ne "$version.0") { throw 'Native host build metadata does not match its executable.' }
  $targetExe=Join-Path $directory 'HeptaFloat.NativeHost.exe'
  $manifest=Manifest-Path $version
  $origin="chrome-extension://$ExtensionId/"
  if (Test-Path -LiteralPath $directory) {
    if (!(Test-Path -LiteralPath $targetExe) -or (Digest $targetExe) -ne $metadata.sha256) { throw 'Existing version differs; build a new version instead of overwriting it.' }
    $existingConfig=Get-Content -LiteralPath (Join-Path $directory 'bridge-config.json') -Raw|ConvertFrom-Json
    $existingManifest=Get-Content -LiteralPath $manifest -Raw|ConvertFrom-Json
    if ($existingConfig.owner -ne 'heptafloat-native-config-v1' -or $existingConfig.origin -ne $origin -or $existingConfig.appInstallRoot -ne $appRoot -or $existingManifest.name -ne $hostName -or $existingManifest.type -ne 'stdio' -or $existingManifest.path -ne $targetExe -or @($existingManifest.allowed_origins).Count -ne 1 -or $existingManifest.allowed_origins[0] -ne $origin) { throw 'Existing native configuration differs; nothing overwritten.' }
  } else {
    New-Item -ItemType Directory -Path $directory -Force|Out-Null
    Copy-Item -LiteralPath $sourceExe -Destination $targetExe
    Write-Json (Join-Path $directory 'bridge-config.json') ([ordered]@{owner='heptafloat-native-config-v1';origin=$origin;appInstallRoot=$appRoot})
    Write-Json $manifest ([ordered]@{name=$hostName;description='Open validated HeptaFloat cards';path=$targetExe;type='stdio';allowed_origins=@($origin)})
  }
  if (!$receipt) { $receipt=[pscustomobject]@{owner='heptafloat-native-install-v1';browser=$Browser;extensionId=$ExtensionId;appInstallRoot=$appRoot;installed=$false;versions=@()} }
  $receipt.extensionId=$ExtensionId; $receipt.appInstallRoot=$appRoot
  $receipt.versions=@(@($receipt.versions|Where-Object{$_ -ne $version})+$version)
  $receipt|Add-Member -NotePropertyName registryKeys -NotePropertyValue @($keys) -Force
  $receipt.installed=$true;Commit-Pointers $keys $manifest
  Write-Output "Installed native host $version for $Browser; one extension origin allowed."
  exit 0
}
if (!$receipt) { Write-Output 'No managed native host; nothing changed.'; exit 0 }
if ($Action -eq 'Rollback' -and $receipt.installed -and @($receipt.versions).Count -gt 1) {
  Assert-OwnedRegistration
  $previous=@($receipt.versions)[-2]
  $previousManifest=Manifest-Path $previous
  if (!(Test-Path -LiteralPath $previousManifest)) { throw 'Previous native manifest is missing.' }
  $receipt.versions=@($receipt.versions|Where-Object{$_ -ne $previous})+@($previous)
  Commit-Pointers @(Receipt-Keys) $previousManifest; Write-Output "Rolled back native host to $previous."; exit 0
}
if ($Action -eq 'Uninstall') { Assert-NoHost }
if ($receipt.installed) { Remove-OwnedKey }
else {foreach($target in $keys){$pointer=Current-Manifest $target;if($pointer -and $pointer.StartsWith("$root\",[StringComparison]::OrdinalIgnoreCase)){throw 'Registration still references these files without an active receipt; preserve and inspect them.'}}}
if ($Action -eq 'Uninstall') {
  foreach($version in @($receipt.versions)) {
    $ownedDirectory=Version-Directory $version # Full absolute containment/reparse check before recursive removal.
    if (Test-Path -LiteralPath $ownedDirectory) { Remove-Item -LiteralPath $ownedDirectory -Recurse -Force }
  }
  $receipt.versions=@(); Save-Receipt
}
Write-Output 'Native host registration removed. Desktop app, browser settings and notes are preserved.'
