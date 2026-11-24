$ErrorActionPreference='Stop'
$assetRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$aseprite='C:/Program Files/Aseprite/Aseprite.exe'
Push-Location $assetRoot
try {
 New-Item -ItemType Directory -Force -Path 'assets/source/skill-revise-v01/native','.cache/skill-revise-native' | Out-Null
 $catalogue=Get-Content -Raw 'assets/reviews/skill-revise-v01/catalogue.json' | ConvertFrom-Json
 foreach($pack in $catalogue.packs){
  if($pack.id -eq 'thien-su'){continue}
  if($pack.id -notmatch '^[a-z0-9-]+$'){throw 'Invalid pack id'}
  $args=@('-b','--script-param',('root='+$assetRoot.Replace('\','/')),'--script-param',('id='+$pack.id),'--script','tools/make-skill-revise-native.lua')
  $proc=Start-Process -FilePath $aseprite -ArgumentList $args -WorkingDirectory $assetRoot -WindowStyle Hidden -Wait -PassThru
  if($proc.ExitCode){throw ('Native source failed: '+$pack.id)}
  $native='assets/source/skill-revise-v01/native/'+$pack.id+'.aseprite'
  $png='.cache/skill-revise-native/'+$pack.id+'.png'
  $proc=Start-Process -FilePath $aseprite -ArgumentList @('-b',$native,'--sheet-type','rows','--sheet-columns','16','--sheet',$png) -WorkingDirectory $assetRoot -WindowStyle Hidden -Wait -PassThru
  if($proc.ExitCode){throw ('Native roundtrip failed: '+$pack.id)}
 }
 python -X utf8 'assets/source/skill-revise-v01/verify-native.py'
 if($LASTEXITCODE){throw 'Native pixel verification failed'}
}finally{Pop-Location}
