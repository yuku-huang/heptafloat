# Temporary exact-origin Edge discovery comparison using its documented fallback keys.
# Restore removes only this probe's owned leaf; it never changes browser policy or HKLM.
[CmdletBinding()]
param(
  [ValidateSet('Stage','Status','Restore')][string]$Action='Status',
  [ValidateSet('Chromium','Chrome')][string]$Fallback='Chromium'
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$name='com.heptafloat.bridge'
$parent=if($Fallback -eq 'Chrome'){'HKCU:\Software\Google\Chrome\NativeMessagingHosts'}else{'HKCU:\Software\Chromium\NativeMessagingHosts'}
$key=Join-Path $parent $name
$stateFile=Join-Path $PSScriptRoot '..\build\native-discovery-probe-state.json'
if($Fallback -eq 'Chrome'){$stateFile=Join-Path $PSScriptRoot '..\build\native-discovery-probe-Chrome-state.json'}
$owner='heptafloat-native-discovery-probe-v1'
function Current-Value { if(Test-Path -LiteralPath $key){return (Get-Item -LiteralPath $key).GetValue('')};return $null }
function Save-State { [IO.File]::WriteAllText([IO.Path]::GetFullPath($stateFile),($state|ConvertTo-Json),[Text.UTF8Encoding]::new($false)) }
$state=$null
if(Test-Path -LiteralPath $stateFile){$state=Get-Content -LiteralPath $stateFile -Raw|ConvertFrom-Json;if($state.owner -ne $owner){throw 'Unknown probe state; nothing changed.'}}
if($Action -eq 'Status'){
  [pscustomobject]@{active=($null -ne $state -and $state.active);registered=(Test-Path -LiteralPath $key);matchesOwned=($null -ne $state -and (Current-Value) -eq $state.manifestPath)}|ConvertTo-Json
  exit 0
}
if($Action -eq 'Restore'){
  if(!$state -or !$state.active){Write-Output 'No active discovery probe; nothing changed.';exit 0}
  $item=Get-Item -LiteralPath $key
  if((Current-Value) -ne $state.manifestPath -or $item.SubKeyCount -ne 0 -or @($item.GetValueNames()).Count -ne 1){throw 'Probe registration changed; leaving it untouched.'}
  Remove-Item -LiteralPath $key
  if($state.createdParent -and (Test-Path -LiteralPath $parent)){
    $parentItem=Get-Item -LiteralPath $parent
    if($parentItem.SubKeyCount -eq 0 -and @($parentItem.GetValueNames()).Count -eq 0){Remove-Item -LiteralPath $parent}
  }
  $state.active=$false;Save-State
  Write-Output "Removed the temporary $Fallback fallback. The Edge registration is unchanged."
  exit 0
}
if($state -and $state.active){
  if((Current-Value) -ne $state.manifestPath){throw 'Active probe registration changed; nothing overwritten.'}
  Write-Output 'The same discovery probe is already active.';exit 0
}
if(Test-Path -LiteralPath $key){throw 'A host with this name already exists at the fallback key; nothing overwritten.'}
$installRoot=Join-Path $env:LOCALAPPDATA 'Programs\HeptaFloatNativeBridge\Edge'
$receipt=Get-Content -LiteralPath (Join-Path $installRoot 'native-install-state.json') -Raw|ConvertFrom-Json
if($receipt.owner -ne 'heptafloat-native-install-v1' -or !$receipt.installed -or $receipt.browser -ne 'Edge' -or $receipt.extensionId -notmatch '^[a-p]{32}$'){throw 'A managed Edge host is required.'}
$version=@($receipt.versions)[-1]
if($version -notmatch '^\d+\.\d+\.\d+$'){throw 'Invalid managed host version.'}
$manifestFile=Join-Path (Join-Path $installRoot $version) "$name.json"
$edgeKey="HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$name"
if((Get-Item -LiteralPath $edgeKey).GetValue('') -ne $manifestFile){throw 'The managed Edge registration changed.'}
$manifest=Get-Content -LiteralPath $manifestFile -Raw|ConvertFrom-Json
if($manifest.name -ne $name -or $manifest.type -ne 'stdio' -or @($manifest.allowed_origins).Count -ne 1 -or $manifest.allowed_origins[0] -ne "chrome-extension://$($receipt.extensionId)/" -or !(Test-Path -LiteralPath $manifest.path -PathType Leaf)){throw 'The managed manifest is invalid.'}
$createdParent=!(Test-Path -LiteralPath $parent)
$state=[pscustomobject]@{owner=$owner;active=$false;manifestPath=$manifestFile;createdParent=$createdParent}
New-Item -ItemType Directory -Path (Split-Path -Parent $stateFile) -Force|Out-Null
Save-State
New-Item -Path $key -Force|Out-Null
Set-Item -LiteralPath $key -Value $manifestFile
$state.active=$true;Save-State
Write-Output "Staged the exact same host/origin at the documented Edge $Fallback fallback. Restore after the browser comparison."
