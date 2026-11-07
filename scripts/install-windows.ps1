# Per-user installation and flowhepta association only. No administrator rights,
# HTTP(S)/heptabase changes, services, or user-note removal.
[CmdletBinding()]
param(
  [ValidateSet('Install','Status','Rollback','Uninstall')][string]$Action = 'Status',
  [string]$SourceDirectory,
  [string]$InstallRoot = (Join-Path $env:LOCALAPPDATA 'Programs\HeptaFloat')
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$rootPath = [IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
if ($rootPath -eq [IO.Path]::GetPathRoot($rootPath).TrimEnd('\')) { throw 'InstallRoot cannot be a drive root.' }
$receiptPath = Join-Path $rootPath 'install-state.json'
$backupPath = Join-Path $rootPath 'previous-flowhepta.reg'
$schemeKey = 'HKCU:\Software\Classes\flowhepta'
function Get-ProtocolCommand {
  if (Test-Path -LiteralPath "$schemeKey\shell\open\command") { return (Get-Item -LiteralPath "$schemeKey\shell\open\command").GetValue('') }
  return $null
}
function Save-Receipt($Receipt) {
  $Receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath "$receiptPath.tmp" -Encoding utf8
  Move-Item -LiteralPath "$receiptPath.tmp" -Destination $receiptPath -Force
}
function Assert-OwnedVersion([string]$Version) {
  if ($Version -notmatch '^\d+\.\d+\.\d+-win\.\d+$') { throw 'Invalid installed version.' }
  $targetPath = [IO.Path]::GetFullPath((Join-Path $rootPath $Version))
  if (!$targetPath.StartsWith("$rootPath\", [StringComparison]::OrdinalIgnoreCase)) { throw 'Target escaped InstallRoot.' }
  if ((Test-Path -LiteralPath $targetPath) -and ((Get-Item -LiteralPath $targetPath).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Refusing a linked version directory.' }
  return $targetPath
}
function Assert-NotRunning([string]$Directory) {
  $running = @(Get-Process -Name HeptaFloat -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.StartsWith("$Directory\", [StringComparison]::OrdinalIgnoreCase) })
  if ($running.Count) { throw 'Quit the installed HeptaFloat from its tray menu before replacing/removing it. No process was stopped.' }
}
function Register-App([string]$Executable) {
  if (!(Test-Path -LiteralPath $Executable -PathType Leaf)) { throw 'Installed executable is missing.' }
  $oldNodeMode = $env:ELECTRON_RUN_AS_NODE
  try {
    Remove-Item Env:\ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
    $process = Start-Process -FilePath $Executable -ArgumentList '--register-protocol' -PassThru -Wait -WindowStyle Hidden
    if ($process.ExitCode -ne 0) { throw 'Electron could not register/verify flowhepta.' }
  } finally {
    if ($null -ne $oldNodeMode) { $env:ELECTRON_RUN_AS_NODE = $oldNodeMode }
  }
  return Get-ProtocolCommand
}
function Restore-Original($Receipt) {
  # Do not remove another application's association installed since this receipt.
  if ((Get-ProtocolCommand) -ne $Receipt.command) { throw 'flowhepta changed since installation; leaving it untouched.' }
  if (Test-Path -LiteralPath $schemeKey) { Remove-Item -LiteralPath $schemeKey -Recurse -Force }
  if ($Receipt.hadPrevious) {
    if (!(Test-Path -LiteralPath $backupPath)) { throw 'Original association backup is missing.' }
    & reg.exe import $backupPath | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Could not restore original flowhepta association.' }
  }
}
$receipt = $null
if (Test-Path -LiteralPath $receiptPath) {
  $receipt = Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json
  if ($receipt.owner -ne 'heptafloat-protocol-install-v1') { throw 'Unknown install receipt; refusing to overwrite.' }
}
if ($Action -eq 'Status') {
  [pscustomobject]@{ installRoot=$rootPath; installed=($null -ne $receipt -and $receipt.installed); command=(Get-ProtocolCommand) } | ConvertTo-Json
  exit 0
}
if ($Action -eq 'Install') {
  if (!$SourceDirectory) { $SourceDirectory = Split-Path -Parent $PSScriptRoot }
  $sourcePath = (Resolve-Path -LiteralPath $SourceDirectory).Path
  $sourceExe = Join-Path $sourcePath 'HeptaFloat.exe'
  if (!(Test-Path -LiteralPath $sourceExe) -or !(Test-Path -LiteralPath (Join-Path $sourcePath 'resources\app.asar'))) { throw 'SourceDirectory must be the complete packaged HeptaFloat folder.' }
  $version = (Get-Item -LiteralPath $sourceExe).VersionInfo.ProductVersion
  $versionPath = Assert-OwnedVersion $version
  Assert-NotRunning $versionPath
  if ($sourcePath.TrimEnd('\') -eq $versionPath) { throw 'Install from the extracted distribution, not the destination.' }
  New-Item -ItemType Directory -Path $rootPath -Force | Out-Null
  if (!$receipt -or !$receipt.installed) {
    $hadPrevious = Test-Path -LiteralPath $schemeKey
    if ($hadPrevious) {
      & reg.exe export 'HKCU\Software\Classes\flowhepta' $backupPath /y | Out-Null
      if ($LASTEXITCODE -ne 0) { throw 'Could not back up existing flowhepta association.' }
    }
    $receipt = [pscustomobject]@{ owner='heptafloat-protocol-install-v1'; installed=$false; hadPrevious=$hadPrevious; versions=@(); command=(Get-ProtocolCommand) }
  } elseif ((Get-ProtocolCommand) -ne $receipt.command) { throw 'flowhepta is now owned by another app; leaving it untouched.' }
  New-Item -ItemType Directory -Path $versionPath -Force | Out-Null
  Get-ChildItem -LiteralPath $sourcePath -Force | Copy-Item -Destination $versionPath -Recurse -Force
  $installedExe = Join-Path $versionPath 'HeptaFloat.exe'
  try { $newCommand = Register-App $installedExe }
  catch {
    $failure = $_
    $currentCommand = Get-ProtocolCommand
    if ($currentCommand -and $currentCommand.StartsWith(('"' + $installedExe + '"'), [StringComparison]::OrdinalIgnoreCase)) {
      $receipt.command = $currentCommand
      Restore-Original $receipt
    }
    throw $failure
  }
  $receipt.command = $newCommand
  $receipt.versions = @(@($receipt.versions | Where-Object { $_ -ne $version }) + $version)
  $receipt.installed = $true
  Save-Receipt $receipt
  Write-Output "Installed $version; flowhepta now opens $(Join-Path $versionPath 'HeptaFloat.exe')"
  exit 0
}
if (!$receipt -or !$receipt.installed) { Write-Output 'No managed installation; nothing changed.'; exit 0 }
if ($Action -eq 'Rollback' -and @($receipt.versions).Count -gt 1) {
  if ((Get-ProtocolCommand) -ne $receipt.command) { throw 'Association changed; rollback left it untouched.' }
  $previous = $receipt.versions[-2]
  $receipt.command = Register-App (Join-Path (Assert-OwnedVersion $previous) 'HeptaFloat.exe')
  $receipt.versions = @($receipt.versions | Where-Object { $_ -ne $previous }) + @($previous)
  Save-Receipt $receipt
  Write-Output "Protocol rolled back to $previous; quit the current app before opening links."
  exit 0
}
# First-install rollback restores the prior association and keeps package files.
if ($Action -eq 'Uninstall') { foreach ($version in $receipt.versions) { Assert-NotRunning (Assert-OwnedVersion $version) } }
Restore-Original $receipt
if ($Action -eq 'Uninstall') {
  foreach ($version in $receipt.versions) {
    $ownedPath = Assert-OwnedVersion $version
    if (Test-Path -LiteralPath $ownedPath) { Remove-Item -LiteralPath $ownedPath -Recurse -Force }
  }
  $receipt.versions = @()
}
$receipt.installed = $false
Save-Receipt $receipt
Write-Output 'Previous flowhepta association restored. HeptaFloat user settings/recovery and Heptabase notes were preserved.'
