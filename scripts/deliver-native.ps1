param([string]$Destination = 'C:\Users\norml\OneDrive\Desktop\SI FORGE STUDIO')
$ErrorActionPreference='Stop'
$sourceFolder=Split-Path -Parent $PSScriptRoot
$buildFolder=Join-Path $sourceFolder 'release\SI FORGE STUDIO Native'
$package=Get-Content -LiteralPath (Join-Path $sourceFolder 'package.json') -Raw | ConvertFrom-Json
$built=Get-Content -LiteralPath (Join-Path $buildFolder 'resources\app\package.json') -Raw | ConvertFrom-Json
if($built.version -ne $package.version){throw 'Rebuild the native app before delivery.'}
$zipName='SI-FORGE-STUDIO-'+$package.version+'-Native-Preview-Windows-x64.zip'
$zipPath=Join-Path $sourceFolder ('release\'+$zipName)
Add-Type -AssemblyName System.IO.Compression.FileSystem
if(Test-Path -LiteralPath $zipPath){throw 'The versioned native ZIP already exists. Preserve it or choose a new version.'}
[System.IO.Compression.ZipFile]::CreateFromDirectory($buildFolder,$zipPath,[System.IO.Compression.CompressionLevel]::Optimal,$true)
$hash=(Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  $zipName" | Set-Content -LiteralPath (Join-Path $sourceFolder ('release\SHA256SUMS-'+$package.version+'-Native.txt'))
$destinationRoot=[System.IO.Path]::GetFullPath($Destination)
$installFolder=Join-Path $destinationRoot 'SI FORGE STUDIO Native'
$nativeExe=Join-Path $installFolder 'SI FORGE STUDIO.exe'
$running=@(Get-Process | Where-Object {$_.Path -eq $nativeExe -and $_.MainWindowHandle -ne 0})
foreach($process in $running){if(-not $process.CloseMainWindow()){throw 'Close the native preview before updating it.'};if(-not $process.WaitForExit(30000)){throw 'The native preview is still saving. Close it before updating.'}}

$archive=[System.IO.Compression.ZipFile]::OpenRead($zipPath)
try{foreach($entry in $archive.Entries){$target=[System.IO.Path]::GetFullPath((Join-Path $destinationRoot $entry.FullName));if(-not $target.StartsWith($installFolder+[System.IO.Path]::DirectorySeparatorChar,[System.StringComparison]::OrdinalIgnoreCase)){throw 'Archive entry is outside the native app folder.'}if($entry.Name -eq ''){[System.IO.Directory]::CreateDirectory($target)|Out-Null;continue};[System.IO.Directory]::CreateDirectory((Split-Path -Parent $target))|Out-Null;[System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$target,$true)}}finally{$archive.Dispose()}
$oldProjects=Join-Path $destinationRoot 'projects'
$newProjects=Join-Path $installFolder 'projects'
[System.IO.Directory]::CreateDirectory($newProjects)|Out-Null
$copied=0
if(Test-Path -LiteralPath $oldProjects){foreach($projectFile in Get-ChildItem -LiteralPath $oldProjects -Filter '*.siforge' -File){$target=Join-Path $newProjects $projectFile.Name;if(-not(Test-Path -LiteralPath $target)){Copy-Item -LiteralPath $projectFile.FullName -Destination $target;$copied++}}}
Start-Process -FilePath (Join-Path $installFolder 'SI FORGE STUDIO.exe') -WorkingDirectory $installFolder
Write-Output "Opened native preview at $installFolder"
Write-Output "Copied $copied encrypted project files; classic application and original projects are preserved."
Write-Output "Portable ZIP: $zipPath"
