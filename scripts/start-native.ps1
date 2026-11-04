$ErrorActionPreference='Stop'
$sourceFolder=Split-Path -Parent $PSScriptRoot
$exe=Join-Path $sourceFolder 'release\SI FORGE STUDIO Native\SI FORGE STUDIO.exe'
if(-not(Test-Path -LiteralPath $exe)){& (Join-Path $PSScriptRoot 'package-native.ps1')}
$env:SI_SOURCE=$sourceFolder
$env:SI_WORKSPACE_ROOT=Join-Path $sourceFolder 'workspace'
$env:SI_NODE=(Get-Command node).Source
Start-Process -FilePath $exe -WorkingDirectory (Split-Path -Parent $exe)
