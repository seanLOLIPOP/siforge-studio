param([string]$Dotnet = "$env:LOCALAPPDATA\SIForgeBuildTools\dotnet\dotnet.exe",[string]$WebViewRuntime = "$env:LOCALAPPDATA\SIForgeBuildTools\WebView2Fixed\Microsoft.WebView2.FixedVersionRuntime.156.0.4314.58.x64")
$ErrorActionPreference='Stop'
if(-not(Test-Path -LiteralPath $Dotnet)){$Dotnet=(Get-Command dotnet).Source}
$env:DOTNET_CLI_TELEMETRY_OPTOUT='1'
$env:DOTNET_GENERATE_ASPNET_CERTIFICATE='false'
$sourceFolder=Split-Path -Parent $PSScriptRoot
$destination=Join-Path $sourceFolder 'release\SI FORGE STUDIO Native'
& $Dotnet publish (Join-Path $sourceFolder 'native\SIForge.Native.csproj') -c Release -r win-x64 --self-contained true -o $destination
if($LASTEXITCODE -ne 0){throw 'Native publish failed.'}
if(-not(Test-Path -LiteralPath (Join-Path $WebViewRuntime 'msedgewebview2.exe'))){throw 'The fixed WebView2 runtime is required for portable delivery.'}
$appFolder=Join-Path $destination 'resources\app'
New-Item -ItemType Directory -Path $appFolder -Force | Out-Null
foreach($folder in @('src','public','licenses')){Copy-Item -LiteralPath (Join-Path $sourceFolder $folder) -Destination $appFolder -Recurse -Force}
Copy-Item -LiteralPath (Join-Path $sourceFolder 'package.json') -Destination $appFolder -Force
$nodeFolder=Join-Path $destination 'runtime'
New-Item -ItemType Directory -Path $nodeFolder -Force | Out-Null
Copy-Item -LiteralPath (Get-Command node).Source -Destination (Join-Path $nodeFolder 'node.exe') -Force
Copy-Item -LiteralPath (Join-Path $sourceFolder 'licenses\NODE-LICENSE.txt') -Destination $nodeFolder -Force
$browserFolder=Join-Path $destination 'webview2'
New-Item -ItemType Directory -Path $browserFolder -Force | Out-Null
Get-ChildItem -LiteralPath $WebViewRuntime | Copy-Item -Destination $browserFolder -Recurse -Force
foreach($file in @('README.md','VALIDATION.md')){Copy-Item -LiteralPath (Join-Path $sourceFolder $file) -Destination $destination -Force}
$licenseFolder=Join-Path $appFolder 'licenses'
$dotnetFolder=Split-Path -Parent $Dotnet
foreach($item in @(@('LICENSE.txt','DOTNET-LICENSE.txt'),@('ThirdPartyNotices.txt','DOTNET-THIRDPARTY.txt'))){if(Test-Path -LiteralPath (Join-Path $dotnetFolder $item[0])){Copy-Item -LiteralPath (Join-Path $dotnetFolder $item[0]) -Destination (Join-Path $licenseFolder $item[1]) -Force}}
$webviewPackage=Join-Path $env:USERPROFILE '.nuget\packages\microsoft.web.webview2\1.0.4314.35'
foreach($item in @(@('LICENSE.txt','WEBVIEW2-LICENSE.txt'),@('NOTICE.txt','WEBVIEW2-NOTICE.txt'))){Copy-Item -LiteralPath (Join-Path $webviewPackage $item[0]) -Destination (Join-Path $licenseFolder $item[1]) -Force}
$entries=@(Get-ChildItem -LiteralPath $destination | Where-Object {$_.Name -notin @('projects','exports','.native-data','.studio-data','.studio-cache','native-manifest.json')} | ForEach-Object Name)
@{version=1;entries=$entries} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $destination 'native-manifest.json')
Write-Output $destination
