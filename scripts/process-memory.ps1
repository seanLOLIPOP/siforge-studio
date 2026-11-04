param([int]$RootPid)
$all=@(Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId)
$ids=[System.Collections.Generic.HashSet[int]]::new()
[void]$ids.Add($RootPid)
do {$added=$false;foreach($process in $all){if($ids.Contains([int]$process.ParentProcessId)-and -not $ids.Contains([int]$process.ProcessId)){[void]$ids.Add([int]$process.ProcessId);$added=$true}}}while($added)
$processes=@(Get-Process -Id @($ids) -ErrorAction SilentlyContinue)
@{processes=$processes.Count;privateBytes=($processes|Measure-Object PrivateMemorySize64 -Sum).Sum;workingSetBytes=($processes|Measure-Object WorkingSet64 -Sum).Sum} | ConvertTo-Json -Compress
