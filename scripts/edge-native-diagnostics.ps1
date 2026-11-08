# Manual diagnostic launcher: existing Edge/profile, logging only, no remote debugging,
# policy edits, extension automation, forced exit, credentials or card-content collection.
[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
try {
  $running=@(Get-CimInstance Win32_Process -Filter "Name='msedge.exe'"|Where-Object{$_.CommandLine -notmatch '--type='})
  if($running.Count){throw 'Exit Edge normally before running this diagnostic launcher. No process was stopped.'}
  $edge=Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'
  if(!(Test-Path -LiteralPath $edge -PathType Leaf)){$edge=Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'}
  if(!(Test-Path -LiteralPath $edge -PathType Leaf)){throw 'The installed Microsoft Edge executable was not found.'}
  $session=Join-Path $PSScriptRoot ('..\build\edge-native-diagnostics\'+[guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $session -Force|Out-Null
  $log=[IO.Path]::GetFullPath((Join-Path $session 'edge.log'))
  $arguments=@('--enable-logging','--v=0','--vmodule=launch_context*=1,native_process_launcher*=1,native_messaging_host_manifest*=1',('--log-file="'+$log+'"'))
  # This launcher is run manually for an interactive test; keep its Edge window visible.
  Start-Process -FilePath $edge -ArgumentList $arguments -WindowStyle Normal|Out-Null
  Write-Output 'In Edge/Discord, open ONE existing card link and press the blue Flow HeptaBase button if needed.'
  [void](Read-Host 'Then return to this window and press Enter')
  $lines=@()
  if(Test-Path -LiteralPath $log){$lines=@(Get-Content -LiteralPath $log|Where-Object{$_ -match 'com\.heptafloat\.bridge'})}
  if(!$lines.Count){$lines=@('No matching native-host log line was recorded. This does not prove a successful launch.')}
  # Show only our host's discovery/manifest errors; never dump the whole browser log.
  $result=$lines -join [Environment]::NewLine
  [IO.File]::WriteAllText((Join-Path $session 'native-host-errors.txt'),$result,[Text.UTF8Encoding]::new($false))
  Write-Output $result
  Write-Output 'Copy the matching error lines into the chat. Keep the full browser log private.'
  Write-Output ('Local diagnostic folder: '+[IO.Path]::GetFullPath($session))
}catch{Write-Error $_ -ErrorAction Continue}
[void](Read-Host 'Press Enter to close this diagnostic window')
