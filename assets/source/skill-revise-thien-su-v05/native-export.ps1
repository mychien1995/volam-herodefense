$ErrorActionPreference='Stop'
$skillRepairRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$skillRepairAseprite='C:/Program Files/Aseprite/Aseprite.exe'
Push-Location $skillRepairRoot
try {
 New-Item -ItemType Directory -Force -Path 'assets/source/skill-revise-thien-su-v05/native' | Out-Null
 $skillRepairProcess=Start-Process -FilePath $skillRepairAseprite -ArgumentList @('-b','--script-param',('root='+$skillRepairRoot.Replace('\','/')),'--script-param','id=hammer-slam-v5','--script-param','bundle=skill-revise-thien-su-v05','--script','tools/make-skill-revise-native.lua') -WorkingDirectory $skillRepairRoot -WindowStyle Hidden -Wait -PassThru
 if($skillRepairProcess.ExitCode){throw 'Native export failed'}
 $skillRepairProcess=Start-Process -FilePath $skillRepairAseprite -ArgumentList @('-b','assets/source/skill-revise-thien-su-v05/native/hammer-slam-v5.aseprite','--sheet-type','rows','--sheet-columns','16','--sheet','assets/source/skill-revise-thien-su-v05/native/hammer-slam-v5-roundtrip.png') -WorkingDirectory $skillRepairRoot -WindowStyle Hidden -Wait -PassThru
 if($skillRepairProcess.ExitCode){throw 'Native roundtrip failed'}
 python -X utf8 assets/source/skill-revise-thien-su-v05/verify.py
 if($LASTEXITCODE){throw 'Native validation failed'}
}finally{Pop-Location}

