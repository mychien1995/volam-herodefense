"""Record actual produced files, provenance and review status. Does not edit images."""
from pathlib import Path
from PIL import Image
import hashlib,json
ROOT=Path(__file__).resolve().parent.parent
def file(path):
    p=ROOT/path
    result={'path':path,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
    if p.suffix=='.png':result['dimensions']=list(Image.open(p).size)
    return result
assets=[]
for id,name in [('forest','Rừng Trúc'),('desert','Sa Mạc'),('sea','Biển'),('hell','Địa Ngục')]:
    assets.append({'id':f'dungeon_card_{id}','purpose':f'{name} destination illustration only',
      'source':file(f'assets/source/dungeon_cards/{id}.aseprite'),
      'generationSource':file(f'assets/source/dungeon_cards/generated_{id}.png'),
      'exports':[file(f'assets/exports/dungeon_cards/{id}.png'),file(f'assets/exports/dungeon_cards/{id}_atlas.png'),file(f'assets/exports/dungeon_cards/{id}.json')],
      'dimensions':[512,768],'animated':False,'transparency':'Opaque full-bleed illustration; border/text/selection are live UI',
      'pivot':[0,0],'collision':None,'display':'Responsive card image; art-directed crop at short desktop height',
      'layers':'Three explicitly separated editable spatial regions: distance, middle landmark, foreground. Not recovered original scene layers.',
      'status':{'produced':True,'integrated':True,'runtimeVerified':False,'directorApproved':False}})
assets.append({'id':'arena_ground_v2','purpose':'Expanded arena ground component, separate from statue/props/actors/HUD',
 'source':file('assets/source/arena_v2/ground.aseprite'),'exports':[file('assets/exports/arena_v2/ground.png')],
 'generationSource':[file('assets/source/arena_v2/generated_ground.png'),file('assets/source/arena_v2/generated_masonry.png')],
 'dimensions':[1600,1152],'animated':False,'pivot':[0,0],'displayScale':1,
 'layers':['Reconstructed meadow','Detailed plate with edge transition','Approaches from authored 32px tile variants','Curved stone paving'],
 'collision':'maps/arena.tmj shared authoritative geometry; no collision baked into art',
 'status':{'produced':True,'integrated':True,'runtimeVerified':False,'directorApproved':False}})
assets.append({'id':'arena_paving_v2','purpose':'Four reusable authored 32px stone slab variants',
 'source':file('assets/source/arena_v2/paving.aseprite'),'exports':[file('assets/exports/arena_v2/paving.png'),file('assets/exports/arena_v2/paving.json')],
 'dimensions':[32,32],'frames':4,'animated':False,'pivot':[0,0],
 'status':{'produced':True,'integrated':True,'runtimeVerified':False,'directorApproved':False}})
manifest={'version':1,'date':'2026-10-30','scope':'Approved arena expansion, target damage and destination-card presentation within M2A',
 'license':'Original project artwork generated with built-in OpenAI image_gen and prepared/exported in Aseprite. Existing original ART-01 props and protected approved Cái Bang artwork reused. No external game art imported.',
 'references':['assets/concept/arena-v2-approved.png','assets/concept/dungeon-selector-approved.png'],
 'generationPrompts':'assets/source/arena_v2/GENERATION.json','asepriteVersion':'1.3.18.6-x64',
 'productionScripts':['scripts/prepare-arena-v2.lua','scripts/export-arena-v2.lua','scripts/export-arena-v2.mjs'],
 'reexport':'pnpm assets:export:visual (preserves artist-edited sources); --prepare explicitly reconstructs from generated PNG components',
 'layout':{'courtCenter':[800,616],'courtSize':[600,540],'previousApproxDiameter':440,'diameterIncrease':'36%','roadWidth':160,'previousRoadWidth':100,'roadIncrease':'60%','statue':[800,576],'removed':['tree_west','trunk_west'],'perimeterTrees':{'tree_east':[1220,870],'tree_north':[480,330]},'invasionMarkersUnchanged':True},
 'remainingPlaceholders':['creep_outlaw enemy','fire/arc effects','Guide reused character frame','M2A forest environment'],
 'approval':{'concept':'Approved direction only','runtime':'PENDING director visual approval'},'assets':assets}
(ROOT/'assets/arena_v2.manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Recorded six produced/integrated asset entries with actual hashes; runtime review pending')
