$ErrorActionPreference='Stop'
$sweepRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$sweepAseprite='C:/Program Files/Aseprite/Aseprite.exe'
Push-Location $sweepRoot
try {
 New-Item -ItemType Directory -Force -Path 'assets/source/skill-revise-sweep-v03/native' | Out-Null
 $sweepArgs=@('-b','--script-param',('root='+$sweepRoot.Replace('\','/')),'--script-param','id=sweep-v3','--script-param','bundle=skill-revise-sweep-v03','--script','tools/make-skill-revise-native.lua')
 $sweepProcess=Start-Process -FilePath $sweepAseprite -ArgumentList $sweepArgs -WorkingDirectory $sweepRoot -WindowStyle Hidden -Wait -PassThru
 if($sweepProcess.ExitCode){throw 'Sweep native export failed'}
 $sweepProcess=Start-Process -FilePath $sweepAseprite -ArgumentList @('-b','assets/source/skill-revise-sweep-v03/native/sweep-v3.aseprite','--sheet-type','rows','--sheet-columns','16','--sheet','assets/source/skill-revise-sweep-v03/native/sweep-v3-roundtrip.png') -WorkingDirectory $sweepRoot -WindowStyle Hidden -Wait -PassThru
 if($sweepProcess.ExitCode){throw 'Sweep native roundtrip failed'}
 python -X utf8 'assets/source/skill-revise-sweep-v03/verify.py'
 if($LASTEXITCODE){throw 'Sweep pixel validation failed'}
}finally{Pop-Location}
