$ErrorActionPreference='Stop'
$skillFeedbackRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$skillFeedbackAseprite='C:/Program Files/Aseprite/Aseprite.exe'
Push-Location $skillFeedbackRoot
try {
 New-Item -ItemType Directory -Force -Path 'assets/source/skill-revise-feedback-v02/native' | Out-Null
 $skillFeedbackCatalogue=Get-Content -Raw 'assets/exports/skill-revise-feedback-v02/catalogue.json' | ConvertFrom-Json
 foreach($pack in $skillFeedbackCatalogue.assets){
  if($pack.id -notmatch '^[a-z0-9-]+$'){throw 'Invalid pack id'}
  $skillFeedbackArgs=@('-b','--script-param',('root='+$skillFeedbackRoot.Replace('\','/')),'--script-param',('id='+$pack.id),'--script-param','bundle=skill-revise-feedback-v02','--script','tools/make-skill-revise-native.lua')
  $skillFeedbackProcess=Start-Process -FilePath $skillFeedbackAseprite -ArgumentList $skillFeedbackArgs -WorkingDirectory $skillFeedbackRoot -WindowStyle Hidden -Wait -PassThru
  if($skillFeedbackProcess.ExitCode){throw ('Native export failed: '+$pack.id)}
  $native='assets/source/skill-revise-feedback-v02/native/'+$pack.id+'.aseprite'
  $png='assets/source/skill-revise-feedback-v02/native/'+$pack.id+'-roundtrip.png'
  $skillFeedbackProcess=Start-Process -FilePath $skillFeedbackAseprite -ArgumentList @('-b',$native,'--sheet-type','rows','--sheet-columns','16','--sheet',$png) -WorkingDirectory $skillFeedbackRoot -WindowStyle Hidden -Wait -PassThru
  if($skillFeedbackProcess.ExitCode){throw ('Native roundtrip failed: '+$pack.id)}
 }
 python -X utf8 'assets/source/skill-revise-feedback-v02/verify.py'
 if($LASTEXITCODE){throw 'Native pixel validation failed'}
}finally{Pop-Location}
