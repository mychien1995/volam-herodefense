param([string]$Aseprite = 'C:/Program Files/Aseprite/Aseprite.exe')
$ErrorActionPreference='Stop'
$finishRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Push-Location $finishRoot
try {
  New-Item -ItemType Directory -Force .cache/hero-finish-native-check | Out-Null
  $rootArgument='"root='+$finishRoot.Replace('\','/')+'"'
  $process=Start-Process -FilePath $Aseprite -ArgumentList @('-b','--script-param',$rootArgument,'--script','assets/source/hero-finish-v1/make-editable.lua') -WorkingDirectory $finishRoot -WindowStyle Hidden -Wait -PassThru
  if($process.ExitCode -ne 0){throw 'Native source export failed'}
  $manifest=Get-Content -Raw assets/source/hero-finish-v1/manifest.json | ConvertFrom-Json
  foreach($entry in $manifest.actors){
    if($entry.basic -notmatch '^[a-z_]+$'){throw 'Invalid actor identifier'}
    $inputFile='assets/source/hero-finish-v1/editable/'+$entry.basic+'.aseprite'
    $outputFile='.cache/hero-finish-native-check/'+$entry.basic+'.png'
    $process=Start-Process -FilePath $Aseprite -ArgumentList @('-b',$inputFile,'--sheet-type','rows','--sheet-columns','8','--sheet',$outputFile) -WorkingDirectory $finishRoot -WindowStyle Hidden -Wait -PassThru
    if($process.ExitCode -ne 0){throw 'Native PNG re-export failed'}
  }
  python -X utf8 tools/verify-hero-finish-native.py
  if($LASTEXITCODE){throw 'Native pixel verification failed'}
  python -X utf8 tools/verify-hero-finish.py
  if($LASTEXITCODE){throw 'Artifact verification failed'}
} finally {Pop-Location}
