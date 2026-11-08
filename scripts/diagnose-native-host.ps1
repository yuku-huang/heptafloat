# Read-only discovery report. No browser profile, note data, process launch or registry writes.
[CmdletBinding()]
param([string]$ReportPath)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$name='com.heptafloat.bridge'
$installRoot=Join-Path $env:LOCALAPPDATA 'Programs\HeptaFloatNativeBridge\Edge'
$receiptFile=Join-Path $installRoot 'native-install-state.json'
$receipt=Get-Content -LiteralPath $receiptFile -Raw|ConvertFrom-Json
if($receipt.owner -ne 'heptafloat-native-install-v1' -or $receipt.browser -ne 'Edge' -or !$receipt.installed -or $receipt.extensionId -notmatch '^[a-p]{32}$'){throw 'A managed Edge host is required.'}
$version=@($receipt.versions)[-1]
if($version -notmatch '^\d+\.\d+\.\d+$'){throw 'Invalid managed host version.'}
$versionRoot=Join-Path $installRoot $version
$expectedManifest=Join-Path $versionRoot "$name.json"
$expectedExe=Join-Path $versionRoot 'HeptaFloat.NativeHost.exe'
$views=@()
foreach($view in @([Microsoft.Win32.RegistryView]::Registry32,[Microsoft.Win32.RegistryView]::Registry64)){
  $base=[Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser,$view)
  $parent=$null;$child=$null
  try{
    $parent=$base.OpenSubKey('Software\Microsoft\Edge\NativeMessagingHosts',[Microsoft.Win32.RegistryKeyPermissionCheck]::ReadSubTree,[Security.AccessControl.RegistryRights]::QueryValues)
    if($parent){$child=$parent.OpenSubKey($name,[Microsoft.Win32.RegistryKeyPermissionCheck]::ReadSubTree,[Security.AccessControl.RegistryRights]::QueryValues)}
    $views+=@([ordered]@{view=$view.ToString();parentOpen=($null -ne $parent);childOpen=($null -ne $child);matchesManifest=($null -ne $child -and $child.GetValue('') -eq $expectedManifest)})
  }finally{if($child){$child.Dispose()};if($parent){$parent.Dispose()};$base.Dispose()}
}
$manifest=Get-Content -LiteralPath $expectedManifest -Raw|ConvertFrom-Json
$bytes=[IO.File]::ReadAllBytes($expectedExe)
$algorithm=[Security.Cryptography.SHA256]::Create()
try{$digest=[BitConverter]::ToString($algorithm.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()}finally{$algorithm.Dispose()}
$current=Get-CimInstance Win32_Process -Filter "ProcessId=$PID"
$report=[ordered]@{mode='readonly-native-host-discovery';pid=$PID;parentPid=$current.ParentProcessId;sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value;registry=$views;manifestValid=($manifest.name -eq $name -and $manifest.type -eq 'stdio' -and $manifest.path -eq $expectedExe -and @($manifest.allowed_origins).Count -eq 1 -and $manifest.allowed_origins[0] -eq "chrome-extension://$($receipt.extensionId)/");binaryRead=$true;sha256=$digest;noteWrites=0;registryWrites=0}
$json=$report|ConvertTo-Json -Depth 5
if($ReportPath){
  $reportRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\build')).TrimEnd('\')
  $output=[IO.Path]::GetFullPath($ReportPath)
  if(!$output.StartsWith("$reportRoot\",[StringComparison]::OrdinalIgnoreCase) -or (Test-Path -LiteralPath $output)){throw 'Use a new report file under this repository build directory.'}
  [IO.File]::WriteAllText($output,$json,[Text.UTF8Encoding]::new($false))
}else{Write-Output $json}
