$ErrorActionPreference='Stop'
$skillRepairRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$skillRepairAseprite='C:/Program Files/Aseprite/Aseprite.exe'
Push-Location $skillRepairRoot
try {
 New-Item -ItemType Directory -Force -Path 'assets/source/skill-revise-thien-su-v08/native' | Out-Null
 $skillRepairProcess=Start-Process -FilePath $skillRepairAseprite -ArgumentList @('-b','--script-param',('root='+$skillRepairRoot.Replace('\','/')),'--script-param','id=hammer-sweep-v8','--script-param','bundle=skill-revise-thien-su-v08','--script','tools/make-skill-revise-native.lua') -WorkingDirectory $skillRepairRoot -WindowStyle Hidden -Wait -PassThru
 if($skillRepairProcess.ExitCode){throw 'Native export failed'}
 $skillRepairProcess=Start-Process -FilePath $skillRepairAseprite -ArgumentList @('-b','assets/source/skill-revise-thien-su-v08/native/hammer-sweep-v8.aseprite','--sheet-type','rows','--sheet-columns','16','--sheet','assets/source/skill-revise-thien-su-v08/native/hammer-sweep-v8-roundtrip.png') -WorkingDirectory $skillRepairRoot -WindowStyle Hidden -Wait -PassThru
 if($skillRepairProcess.ExitCode){throw 'Native roundtrip failed'}
 python -X utf8 assets/source/skill-revise-thien-su-v08/verify.py
 if($LASTEXITCODE){throw 'Native validation failed'}
}finally{Pop-Location}

