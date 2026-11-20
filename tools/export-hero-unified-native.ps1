param([string]$Profile='assets/source/cai-bang-bong-unified-v1/profile.json',[string]$Aseprite='C:/Program Files/Aseprite/Aseprite.exe')
$ErrorActionPreference='Stop'
$bodyRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Push-Location $bodyRoot
try{
 $cfg=Get-Content -Raw $Profile|ConvertFrom-Json
 if($cfg.folder -notmatch '^[a-z0-9-]+$'){throw 'Invalid art folder'}
 New-Item -ItemType Directory -Force ('.cache/hero-native-check/'+$cfg.folder)|Out-Null
 $args=@('-b','--script-param',('"root='+$bodyRoot.Replace('\','/')+'"'),'--script-param',('profile='+$Profile),'--script','tools/make-hero-unified.lua')
 $process=Start-Process -FilePath $Aseprite -ArgumentList $args -WorkingDirectory $bodyRoot -WindowStyle Hidden -Wait -PassThru
 if($process.ExitCode -ne 0){throw 'Native body source assembly failed'}
 $native='assets/source/'+$cfg.folder+'/body.aseprite'
 $png='.cache/hero-native-check/'+$cfg.folder+'/roundtrip.png'
 $process=Start-Process -FilePath $Aseprite -ArgumentList @('-b',$native,'--sheet-type','rows','--sheet-columns','16','--sheet',$png) -WorkingDirectory $bodyRoot -WindowStyle Hidden -Wait -PassThru
 if($process.ExitCode -ne 0){throw 'Native roundtrip export failed'}
 python -X utf8 tools/verify-hero-unified.py --profile $Profile --native
 if($LASTEXITCODE){throw 'Native body pixel verification failed'}
}finally{Pop-Location}
