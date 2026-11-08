# Build the small stdio host with the Windows .NET Framework compiler; no packages.
[CmdletBinding()]
param(
  [ValidatePattern('^\d+\.\d+\.\d+$')][string]$Version = '1.0.0',
  [string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if (!$OutputDirectory) { $OutputDirectory = Join-Path $PSScriptRoot '..\build\native-host' }
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (!(Test-Path -LiteralPath $compiler -PathType Leaf)) { throw 'The Windows .NET Framework C# compiler is missing.' }
$outputRoot = [IO.Path]::GetFullPath($OutputDirectory).TrimEnd('\')
if ($outputRoot -eq [IO.Path]::GetPathRoot($outputRoot).TrimEnd('\')) { throw 'OutputDirectory cannot be a drive root.' }
$output = Join-Path $outputRoot $Version
New-Item -ItemType Directory -Path $output -Force | Out-Null
$executable = Join-Path $output 'HeptaFloat.NativeHost.exe'
if (@(Get-Process -Name 'HeptaFloat.NativeHost' -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $executable }).Count) { throw 'This host build is running; choose another output directory.' }
$assembly = Join-Path $output 'AssemblyInfo.cs'
@"
using System.Reflection;
[assembly: AssemblyTitle("HeptaFloat Native Messaging Host")]
[assembly: AssemblyVersion("$Version.0")]
[assembly: AssemblyFileVersion("$Version.0")]
"@ | Set-Content -LiteralPath $assembly -Encoding UTF8
& $compiler /nologo /target:exe /platform:x64 /optimize+ /reference:System.Web.Extensions.dll "/out:$executable" (Join-Path $PSScriptRoot '..\native-host\Program.cs') $assembly
if ($LASTEXITCODE -ne 0) { throw 'Native host compilation failed.' }
$hash = [Security.Cryptography.SHA256]::Create()
$inputFile = [IO.File]::OpenRead($executable)
try { $digest = [BitConverter]::ToString($hash.ComputeHash($inputFile)).Replace('-','').ToLowerInvariant() }
finally { $inputFile.Dispose(); $hash.Dispose() }
[IO.File]::WriteAllText((Join-Path $output 'host-version.json'),([ordered]@{version=$Version;sha256=$digest}|ConvertTo-Json),[Text.UTF8Encoding]::new($false))
Write-Output "Built native host $Version at $output"
