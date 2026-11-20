param([string]$Aseprite = 'C:/Program Files/Aseprite/Aseprite.exe')
$ErrorActionPreference='Stop'
$chuongRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Push-Location $chuongRoot
try {
  New-Item -ItemType Directory -Force .cache/chuong-native-check | Out-Null
  $rootArgument='"root='+$chuongRoot.Replace('\','/')+'"'
  $process=Start-Process -FilePath $Aseprite -ArgumentList @('-b','--script-param',$rootArgument,'--script','assets/source/cai-bang-chuong-unified-v1/make-editable.lua') -WorkingDirectory $chuongRoot -WindowStyle Hidden -Wait -PassThru
  if($process.ExitCode -ne 0){throw 'Aseprite assembly failed'}
  $process=Start-Process -FilePath $Aseprite -ArgumentList @('-b','assets/source/cai-bang-chuong-unified-v1/body.aseprite','--sheet-type','rows','--sheet-columns','20','--sheet','.cache/chuong-native-check/body.png') -WorkingDirectory $chuongRoot -WindowStyle Hidden -Wait -PassThru
  if($process.ExitCode -ne 0){throw 'Aseprite roundtrip export failed'}
  python -X utf8 tools/verify-chuong-unified.py --native
  if($LASTEXITCODE){throw 'Native pixel verification failed'}
} finally {Pop-Location}
