# Configure this task branch's writable fork without replacing the original origin.
# -Push requires committed work and verifies the exact remote SHA after a normal push.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][ValidatePattern('^[A-Za-z0-9][A-Za-z0-9-]{0,38}$')][string]$ExpectedAccount,
  [switch]$Push
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
foreach($command in @('git','gh')){if(!(Get-Command $command -ErrorAction SilentlyContinue)){throw "Required command missing: $command"}}
function Run([string]$Command,[string[]]$Arguments) {
  $output=& $Command @Arguments
  if($LASTEXITCODE -ne 0){throw "$Command failed with exit code $LASTEXITCODE. No force or credential change attempted."}
  return $output
}
$sourceRepository='madeyexz/heptafloat'
$sourceUrl="https://github.com/$sourceRepository.git"
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
  $origin=(Run git @('remote','get-url','origin')|Out-String).Trim()
  if($origin -ne $sourceUrl){throw 'Unexpected origin; inspect it instead of replacing it.'}
  $branch=(Run git @('branch','--show-current')|Out-String).Trim()
  if(!$branch.StartsWith('codex/') -or $branch -notmatch '^codex/[A-Za-z0-9._/-]+$'){throw 'Run from a named codex task branch.'}
  if($Push -and @(Run git @('status','--porcelain')).Count){throw 'Commit or preserve pending work before pushing.'}
  $account=(Run gh @('api','user','--jq','.login')|Out-String).Trim()
  if($account -ne $ExpectedAccount){throw 'GitHub CLI account differs from the explicitly expected account.'}
  $forkRepository="$account/heptafloat"
  $forkUrl="https://github.com/$forkRepository.git"
  $remoteNames=@(Run git @('remote'))
  if('fork' -in $remoteNames){
    $existingUrls=@(Run git @('remote','get-url','--all','fork'))
    $existingPushUrls=@(Run git @('remote','get-url','--push','--all','fork'))
    if($existingUrls.Count -ne 1 -or $existingPushUrls.Count -ne 1 -or $existingUrls[0] -ne $forkUrl -or $existingPushUrls[0] -ne $forkUrl){throw 'Existing fork remote differs; nothing replaced.'}
  }
  # This gh version accepts --remote=false only without a positional repository.
  # Verify its selected repository first; reuse forks without cloning or remote renames.
  $selected=(Run gh @('repo','view','--json','nameWithOwner','--jq','.nameWithOwner')|Out-String).Trim()
  if($selected -ne $sourceRepository){throw 'GitHub CLI selected another repository; nothing forked.'}
  Run gh @('repo','fork','--clone=false','--remote=false')|Out-Host
  $fork=(Run gh @('api',"repos/$forkRepository")|Out-String)|ConvertFrom-Json
  if(!$fork.fork -or $fork.parent.full_name -ne $sourceRepository -or $fork.owner.login -ne $ExpectedAccount -or !$fork.permissions.push){throw 'Expected owned, writable fork relationship was not confirmed.'}
  if('fork' -notin $remoteNames){Run git @('remote','add','fork',$forkUrl)|Out-Host}
  Run git @('config','--local',"branch.$branch.pushRemote",'fork')|Out-Host
  if($Push){
    $head=(Run git @('rev-parse','HEAD')|Out-String).Trim()
    Run git @('push','--set-upstream','fork',"HEAD:refs/heads/$branch")|Out-Host
    $advertised=(Run git @('ls-remote','--exit-code','fork',"refs/heads/$branch")|Out-String).Trim()
    $apiSha=(Run gh @('api',"repos/$forkRepository/git/ref/heads/$branch",'--jq','.object.sha')|Out-String).Trim()
    if(($advertised -split '\s+')[0] -ne $head -or $apiSha -ne $head){throw 'Push returned but remote SHA does not match local HEAD.'}
    Write-Output "Verified pushed commit $head to $forkRepository on $branch."
  }else{Write-Output "Configured branch $branch to push to fork ($forkRepository). Run again with -Push after committing."}
  if((Run git @('remote','get-url','origin')|Out-String).Trim() -ne $origin){throw 'Original origin changed unexpectedly.'}
}finally{Pop-Location}
