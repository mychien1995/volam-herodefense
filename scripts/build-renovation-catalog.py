"""Build the exact M3D art roster and immutable identity references for the renovation preview."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/source/renovation-v1"
SOURCE.mkdir(parents=True, exist_ok=True)

def read(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8-sig"))

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf8")

def frames_of(atlas):
    frames = atlas["frames"]
    return {frame["filename"]: frame for frame in frames} if isinstance(frames, list) else frames

actors = []
def add_actor(asset_id, name, group, biome, sheet, atlas=None, frame=None, height=88, description="", embedded=None, reuse=None):
    image = ROOT / sheet
    assert image.is_file(), sheet
    frames = frames_of(read(atlas)) if atlas else embedded
    assert frames, asset_id
    if frame is None:
        frame = next((key for key in frames if "idle_down" in key), None)
        frame = frame or next((key for key in frames if "idle" in key), next(iter(frames)))
    assert frame in frames, (asset_id, frame)
    actors.append({
        "id": asset_id, "name": name, "group": group, "biome": biome,
        "height": height, "description": description,
        "reference": {"sheet": sheet, "sha256": hashlib.sha256(image.read_bytes()).hexdigest(),
                      "frame": frame, "rectangle": frames[frame]["frame"]},
        "identity": f"assets/source/renovation-v1/references/{asset_id}.png",
        "raw": f"assets/source/renovation-v1/raw/{asset_id}.png",
        "reuse": reuse,
        "status": "reused" if reuse else "queued",
    })

hero_specs = [
    ("hero_cai_bang", "Cái Bang Bổng", "cai_bang", "A young male martial artist in red and brown travel robes, dark ponytail tied with red cloth, holding one long plain wooden staff."),
    ("hero_cai_bang_chuong", "Cái Bang Chưởng", "cai_bang", "The same red-and-brown-robed young Cái Bang martial artist, empty hands in a relaxed palm-ready pose."),
    ("hero_thien_son", "Thiên Sơn Phiến", "thien_son", "A refined young male martial artist in ivory robes with pale cyan embroidery, jade ornaments and a white ribbon, holding one open pale jade folding fan."),
    ("hero_thien_son_dao", "Thiên Sơn Đao", "thien_son", "The same ivory and pale cyan Thiên Sơn martial artist, holding one curved single-edged dao instead of a fan."),
    ("hero_vo_dang", "Võ Đang Quyền", "vo_dang", "A young topknotted male with white ribbon, layered ivory and charcoal robes and silver yin-yang waist ornament, empty hands in relaxed martial readiness."),
    ("hero_vo_dang_kiem", "Võ Đang Kiếm", "vo_dang", "The accepted ivory-and-charcoal Võ Đang swordsman holding a straight silver jian."),
    ("hero_thieu_lam", "Thiếu Lâm Quyền", "thieu_lam", "A sturdy young bald monk in saffron gold and brown robes, dark prayer beads, wrapped wrists and calves, empty fists."),
    ("hero_thieu_lam_dao", "Thiếu Lâm Đao", "thieu_lam", "The same saffron and brown young bald Thiếu Lâm monk with prayer beads and white wraps, holding one broad curved silver dao."),
]
revised = {asset["id"]: asset for asset in read("assets/exports/characters/visual_improvement_v02/manifest.json")["assets"]}
for asset_id, name, school, description in hero_specs:
    asset = revised.get(asset_id)
    sheet = asset["sheet"] if asset else f"assets/exports/characters/{asset_id}.png"
    atlas = asset["atlas"] if asset else f"assets/exports/characters/{asset_id}.json"
    reuse = {"sheet": "assets/exports/visual-upgrade-2/hero.png", "atlas": "assets/exports/visual-upgrade-2/hero.json", "canvas": [192, 160], "pivot": [96, 128]} if asset_id == "hero_vo_dang_kiem" else None
    add_actor(asset_id, name, "heroes", "arena", sheet, atlas, description=description, reuse=reuse)
    actors[-1]["school"] = school

names = {}
for asset in read("assets/arena_creeps.manifest.json")["assets"]:
    names[asset["id"]] = asset["nameVi"]
for asset in read("assets/desert_dungeon.manifest.json")["assets"]:
    names[asset["id"]] = asset["nameVi"]
for path in (ROOT / "assets/sprites/creeps/dungeons").rglob("*manifest*.json"):
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    if data.get("id") and data.get("nameVi"):
        names[data["id"]] = data["nameVi"]
    for item in data.get("assets", []) + data.get("enemies", []):
        if item.get("id") and item.get("nameVi"):
            names[item["id"]] = item["nameVi"]
from PIL import Image
for asset in read("assets/reviews/creeps/motion-v08/integration.json")["assets"]:
    atlas = read(asset["atlas"])
    frames = frames_of(atlas)
    frame = next((key for key in frames if "idle_down" in key), next(iter(frames)))
    rectangle = frames[frame]["frame"]
    image = Image.open(ROOT / asset["raster"]).convert("RGBA")
    crop = image.crop((rectangle["x"], rectangle["y"], rectangle["x"] + rectangle["w"], rectangle["y"] + rectangle["h"]))
    box = crop.getchannel("A").point(lambda value: 255 if value >= 96 else 0).getbbox()
    height = round((box[3] - box[1]) * 2) if box else 72
    biome = "arena" if asset["id"].startswith("creep_") else asset["id"].split("_")[0]
    biome = {"beach": "sea"}.get(biome, biome)
    add_actor(asset["id"], names.get(asset["id"], asset["id"]), "wave_creeps" if biome == "arena" else "dungeon_creeps",
              biome, asset["raster"], asset["atlas"], frame=frame, height=height,
              description="Retain the exact creature species, anatomy, costume, armor and equipment shown in its identity reference. Animate the natural gait of that species.")
    if biome == "arena":
        actors[-1]["wave"] = next(item["wave"] for item in read("assets/arena_creeps.manifest.json")["assets"] if item["id"] == asset["id"])

dong = read("assets/reviews/bosses/dong_ta_v02/data.json")["bundles"]
for asset_id, key, label, group in [("dong_ta", "dong", "Đông Tà", "wave_bosses"), ("mai_sieu_phong", "mai", "Mai Siêu Phong", "minions"), ("hoang_dung", "hoang", "Hoàng Dung", "minions")]:
    bundle = dong[key]
    add_actor(asset_id, label, group, "arena", bundle["image"], embedded=bundle["frames"], height=124 if group=="wave_bosses" else 96)
tay = read("assets/reviews/tay_doc_v02/packages.json")
for asset_id, key, label, group in [("tay_doc", "p1", "Tây Độc", "wave_bosses"), ("tay_doc_cap_mo", "p2", "Tây Độc · Cáp Mô", "wave_bosses"), ("tay_doc_snake", "snake8", "Linh Xà · Tây Độc", "minions")]:
    package = tay[key]
    folder = package["path"].lstrip("/")
    add_actor(asset_id, label, group, "arena", folder+"/"+package["image"], folder+"/"+package["atlas"], height=124 if group=="wave_bosses" else 90)
add_actor("nam_de", "Nam Đế", "wave_bosses", "arena", "assets/sprites/bosses/main/nam-de/boss_nam_de.png", "assets/sprites/bosses/main/nam-de/boss_nam_de.json", height=124)
add_actor("bac_cai", "Bắc Cái", "wave_bosses", "arena", "assets/sprites/bosses/main/bac-cai/boss_bac_cai.png", "assets/sprites/bosses/main/bac-cai/boss_bac_cai.json", height=124)
for phase, label in [("p1", "Vương Trùng Dương"), ("p2", "Vương Trùng Dương · bỏ kiếm")]:
    add_actor("vuong_trung_duong_"+phase, label, "wave_bosses", "arena", "assets/exports/vuong-trung-duong/body.png", "assets/exports/vuong-trung-duong/body.json", frame=phase+"_down_idle", height=132)
add_actor("bac_cai_black_dog", "Hắc Khuyển · Bắc Cái", "minions", "arena", "assets/sprites/bosses/main/bac-cai/rework-v02/dog/bac_cai_black_dog.png", "assets/sprites/bosses/main/bac-cai/rework-v02/dog/bac_cai_black_dog.json", height=70)
chu = read("apps/game-client/src/chu-art.generated.json")["bundles"]
for asset_id, key, label, group, height in [("chu_ba_thong", "base", "Chu Bá Thông", "dungeon_bosses", 120), ("toan_chan_disciple", "disciple", "Toàn Chân Đệ Tử", "minions", 90)]:
    bundle=chu[key]
    add_actor(asset_id, label, group, "chu_ba_thong", bundle["image"], embedded=bundle["frames"], height=height)
for asset_id, label, filename, group, height in [
    ("hoan_nhan_hong_liet", "Hoàn Nhan Hồng Liệt", "boss_locomotion", "dungeon_bosses", 144),
    ("mongol_infantry", "Bộ Binh Mông Cổ", "minions", "minions", 92),
    ("mongol_archer", "Cung Thủ Mông Cổ", "minion_archer", "minions", 92)]:
    if filename == "minions": filename = "minion_infantry"
    folder="assets/exports/bosses/hoan_nhan_hong_liet_v01/"
    add_actor(asset_id, label, group, "hong_liet", folder+filename+".png", folder+filename+".json", height=height)
for asset_id, label, filename, group, height in [
    ("kim_luan", "Kim Luân Pháp Vương", "kim_luan_base", "dungeon_bosses", 132),
    ("hoac_do", "Hoắc Đô", "hoac_do_base", "minions", 104),
    ("dat_nhi_ba", "Đạt Nhĩ Ba", "dat_nhi_ba_base", "minions", 116),
    ("kim_elephant", "Voi · Kim Luân", "elephant", "minions", 156)]:
    folder="assets/exports/bosses/kim_luan_phap_vuong_v01/"
    add_actor(asset_id, label, group, "kim_luan", folder+filename+".png", folder+filename+".json", height=height)
for asset_id, label, folder, group, height in [
    ("ly_mac_sau", "Lý Mạc Sầu", "assets/sprites/bosses/ly-mac-sau", "dungeon_bosses", 112),
    ("co_mo_am_binh", "Cổ Mộ Âm Binh", "assets/sprites/summons/co-mo-am-binh", "minions", 88)]:
    add_actor(asset_id, label, group, "co_mo", folder+"/spritesheet.png", folder+"/atlas.json", height=height)

scenes = [
    {"id": "forest", "name": "Rừng Trúc", "theme": "A jade bamboo forest clearing with organic earth and small worn stone path patches, rich mossy banks and ferns. Keep the broad central clearing open for combat. Surrounding bamboo, bridge and shrine belong to separate props.", "reference": "assets/references/forest_dungeon_reference.png", "props": "one tall jade bamboo clump, one massive mossy tree, one mossy stone lantern, one old timber footbridge with no stream attached, one small East Asian roofed wooden shrine, one cluster of ferns and mossy rocks"},
    {"id": "desert", "name": "Sa Mạc", "theme": "A sunlit ochre desert ruin clearing with natural sand and softly varied warm sandstone pavement fragments, worn footpaths and small scattered stone chips. Broad open combat center. Ruin walls, broken columns and tents belong to separate props.", "reference": "assets/references/desert_dungeon_reference.png", "props": "one broken sandstone gateway, one pair of eroded ruin pillars on one base, one oasis palm tree, one scarlet merchant tent, one low old sandstone barricade, one cluster of small cactus and bones"},
    {"id": "sea", "name": "Bãi Biển", "theme": "An East Asian tropical coastal beach clearing, warm pale sand, gentle turquoise shallow surf and small foam detail along the right and bottom borders, a few dark stone outcrops. Keep broad center and left side dry and open for combat. Pier, boats and palms belong to separate props.", "reference": "assets/references/sea_dungeon_reference.png", "props": "one tall coconut palm, one short roofed wooden pier segment, one moored traditional wooden boat with folded cream sail, one thatched merchant hut, one cluster of coral and dark rocks, one blue maritime banner on carved post"},
    {"id": "hell", "name": "Địa Ngục", "theme": "A dark infernal stone stronghold clearing, varied charcoal basalt slabs with narrow red seams, restrained molten lava outside the left and right borders and visible stone ledge edges. Keep the central broad stone platform cool dark and open. Chains, gates, demonic statues and braziers belong to separate props.", "reference": "assets/references/hell_dungeon_reference.png", "props": "one enormous black-and-red infernal gate, one carved demonic stone statue, one heavy iron brazier with orange fire, one pillar holding a hanging heavy chain, one scarlet torn banner, one cluster of obsidian and old skulls"},
    {"id": "chu_ba_thong", "name": "Sân Chu Bá Thông", "theme": "A quiet Taoist mountain monastery training court with warm grey small stone slabs, subtle circular yin-yang engraving, jade lawn and moss at the edge. Open broad training center, soft afternoon light. Trees, temple entrance and statues belong to separate props.", "reference": "assets/references/central_arena_hub_reference.png", "props": "one grey-tiled Taoist monastery gate, one old gnarled pine tree, one small stone yin-yang stele, one tall amber lantern post, one low carved stone bench, one wine table with two ceramic jars"},
    {"id": "hong_liet", "name": "Trại Hoàn Nhan", "theme": "A fortified martial army camp training ground, warm reddish stone and packed ochre earth, small worn paving slabs and darker wheel tracks. Sparse faded circular crest in the broad open center. Military tents, cannons, posts and walls belong to separate props.", "reference": "assets/references/arena_battle_reference.png", "props": "one dark red military command tent, one short brick fortification with wooden spikes, one old bronze cannon on a sturdy wooden carriage, one tall scarlet army banner, one wooden supply cart with crates, one iron torch brazier"},
    {"id": "kim_luan", "name": "Sân Kim Luân", "theme": "A mountain Buddhist monastery combat courtyard with subtly warm gold sandstone slabs, an engraved simple wheel motif in the broad open center, old pale stone border and a little sparse alpine grass. Golden accents restrained, distant cold mountain color. Monastery stairs, statues and drums belong to separate props.", "reference": "assets/references/arena_battle_reference.png", "props": "one red-and-gold monastery entrance stair and door, one dignified golden Buddhist statue on stone plinth, one large ceremonial drum on a red wood stand, one red prayer banner post, one short pale stone balustrade, one ancient pine and rock cluster"},
    {"id": "co_mo", "name": "Cổ Mộ", "theme": "An ancient secluded tomb grove courtyard, desaturated lavender-grey small flagstones, sparse moss, faint pale purple flowers and jade vegetation on the border, soft cool moonlit atmosphere. Keep the broad central clearing open and readable, restrained shallow mist only at far edges. Tomb gate, trees and lanterns belong to separate props.", "reference": "assets/references/forest_dungeon_reference.png", "props": "one ancient carved tomb entrance with dark doorway, one pale purple blossom tree, one grey funerary stele, one cold-blue stone lantern, one jade willow tree, one mossy fallen carved stone slab with violet flowers"},
]
catalog={"status":"production_in_progress","baselineCommit":"c823a4a5","scope":{"heroStyles":8,"dungeonArenas":8,"waveCreeps":20,"dungeonCreeps":24,"waveBossIdentities":5,"waveBossForms":7,"dungeonBosses":4},"actors":actors,"scenes":scenes}
write(SOURCE/"catalog.json",catalog)
print(json.dumps({"actors":len(actors),"newActorSheets":sum(not actor["reuse"] for actor in actors),"groups":{key:sum(actor["group"]==key for actor in actors) for key in sorted({actor["group"] for actor in actors})},"scenes":len(scenes)},ensure_ascii=False))

