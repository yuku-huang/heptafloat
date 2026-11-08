# Read-only launch sampling. No registry changes, process termination or raw URLs.
# Short-lived processes may escape polling; zero observations is not proof of no launch.
[CmdletBinding()]
param(
  [ValidateRange(1, 60)][int]$Seconds = 45,
  [string]$ReportPath = (Join-Path $PSScriptRoot '..\build\protocol-launch-observation.json')
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$reportFile = [IO.Path]::GetFullPath($ReportPath)
$reportParent = Split-Path -Parent $reportFile
if (!(Test-Path -LiteralPath $reportParent -PathType Container)) { throw 'Build directory is missing; run the extension build first.' }
if (Test-Path -LiteralPath $reportFile) { throw 'Report already exists. Choose another ReportPath to preserve it.' }
$seen = [Collections.Generic.HashSet[int]]::new()
foreach ($existing in @(Get-Process -Name HeptaFloat -ErrorAction SilentlyContinue)) { [void]$seen.Add($existing.Id) }
$initialCount = $seen.Count
$observations = [Collections.Generic.List[object]]::new()
$timer = [Diagnostics.Stopwatch]::StartNew()
$previousSample = 0L
$longestGap = 0L
Write-Output ('READY: sampling HeptaFloat launches for {0}s; existing processes={1}. No URL will be logged.' -f $Seconds, $initialCount)
while ($timer.Elapsed.TotalSeconds -lt $Seconds) {
  $sampleAt = $timer.ElapsedMilliseconds
  $longestGap = [Math]::Max($longestGap, $sampleAt - $previousSample)
  $previousSample = $sampleAt
  foreach ($process in @(Get-Process -Name HeptaFloat -ErrorAction SilentlyContinue)) {
    if (!$seen.Add($process.Id)) { continue }
    $details = Get-CimInstance Win32_Process -Filter ('ProcessId={0}' -f $process.Id) -ErrorAction SilentlyContinue
    $commandLine = if ($null -ne $details) { [string]$details.CommandLine } else { '' }
    $parentId = if ($null -ne $details) { [int]$details.ParentProcessId } else { 0 }
    $parent = if ($parentId -gt 0) { Get-Process -Id $parentId -ErrorAction SilentlyContinue } else { $null }
    $productVersion = if ($null -ne $details -and $details.ExecutablePath -and (Test-Path -LiteralPath $details.ExecutablePath)) {
      [Diagnostics.FileVersionInfo]::GetVersionInfo($details.ExecutablePath).ProductVersion
    } else { $null }
    $observation = [pscustomobject]@{
      elapsedMs=$sampleAt; processId=$process.Id; parentProcessId=$parentId
      parentName=$(if ($null -ne $parent) { $parent.ProcessName } else { $null })
      productVersion=$productVersion
      commandLineAvailable=($commandLine.Length -gt 0)
      hasFlowCardArgument=($commandLine -match '(?i)flowhepta://card/')
      isElectronHelper=($commandLine -match '(?:^|\s)--type=')
    }
    $observations.Add($observation)
    Write-Output ($observation | ConvertTo-Json -Compress)
  }
  Start-Sleep -Milliseconds 10
}
$timer.Stop()
$report = [pscustomobject]@{
  source='read-only process polling'; durationMs=$timer.ElapsedMilliseconds
  initialProcessCount=$initialCount; newProcessCount=$observations.Count
  longestSampleGapMs=$longestGap; observations=@($observations.ToArray())
  limitation='Polling can miss short-lived processes; no observations does not prove no launch. No app acknowledgement is inferred.'
}
$report | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $reportFile -Encoding UTF8
Write-Output ('Report saved: {0}' -f $reportFile)
