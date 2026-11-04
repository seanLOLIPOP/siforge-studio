param([string]$Destination = 'C:\Users\norml\OneDrive\Desktop\SI FORGE STUDIO')
$ErrorActionPreference = 'Stop'
$sourceFolder = Split-Path -Parent $PSScriptRoot
$packageData = Get-Content -LiteralPath (Join-Path $sourceFolder 'package.json') -Raw | ConvertFrom-Json
$buildFolder = Join-Path $sourceFolder 'release\SI FORGE STUDIO'
$versionFile = Join-Path $buildFolder 'resources\app\package.json'
if (-not (Test-Path -LiteralPath $versionFile)) { throw 'Build the portable app first.' }
if ((Get-Content -LiteralPath $versionFile -Raw | ConvertFrom-Json).version -ne $packageData.version) { throw 'Rebuild the portable app before delivery.' }
$zipName = 'SI-FORGE-STUDIO-' + $packageData.version + '-Windows-x64.zip'
$zipFile = Join-Path $sourceFolder ('release\' + $zipName)
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path -LiteralPath $zipFile) { throw "Release ZIP already exists: $zipFile. Preserve it or choose a new version." }
[System.IO.Compression.ZipFile]::CreateFromDirectory($buildFolder, $zipFile, [System.IO.Compression.CompressionLevel]::Optimal, $true)
$hash = (Get-FileHash -LiteralPath $zipFile -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  $zipName" | Set-Content -LiteralPath (Join-Path $sourceFolder ('release\SHA256SUMS-' + $packageData.version + '.txt'))
$destinationPath = [System.IO.Path]::GetFullPath($Destination)
$destinationParent = Split-Path -Parent $destinationPath
if ((Split-Path -Leaf $destinationPath) -ne 'SI FORGE STUDIO') { throw 'Destination must end with SI FORGE STUDIO to match the portable archive.' }
$exePath = Join-Path $destinationPath 'SI FORGE STUDIO.exe'
$running = @(Get-Process | Where-Object { $_.Path -eq $exePath -and $_.MainWindowHandle -ne 0 })
foreach ($process in $running) {
 if (-not $process.CloseMainWindow()) { throw 'Close the installed Studio before updating it.' }
 if (-not $process.WaitForExit(30000)) { throw 'Studio is still open. Finish saving and close it before updating.' }
}
[System.IO.Directory]::CreateDirectory($destinationParent) | Out-Null
# Archive contains only application files. Extracting over them preserves projects and exports.
$archive = [System.IO.Compression.ZipFile]::OpenRead($zipFile)
try {
 foreach ($entry in $archive.Entries) {
  $outputPath = [System.IO.Path]::GetFullPath((Join-Path $destinationParent $entry.FullName))
  if (-not $outputPath.StartsWith($destinationPath + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Archive entry falls outside the app folder.' }
  if ($entry.Name -eq '') { [System.IO.Directory]::CreateDirectory($outputPath) | Out-Null; continue }
  [System.IO.Directory]::CreateDirectory((Split-Path -Parent $outputPath)) | Out-Null
  [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $outputPath, $true)
 }
} finally { $archive.Dispose() }
$installedVersion = Get-Content -LiteralPath (Join-Path $destinationPath 'resources\app\package.json') -Raw | ConvertFrom-Json
if ($installedVersion.version -ne $packageData.version) { throw 'Installed version does not match the build.' }
Start-Process -FilePath $exePath -WorkingDirectory $destinationPath
Write-Output "Extracted and opened SI FORGE STUDIO $($packageData.version) at $destinationPath"
Write-Output "Portable ZIP: $zipFile"
