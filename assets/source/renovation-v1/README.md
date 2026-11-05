# Renovation v1 — candidate preview

Requested scope: eight weapon styles of the four implemented schools, eight dungeon arenas, every wave/dungeon creep, five wave bosses and helpers, four dungeon bosses. No skill renovation. The accepted Võ Đang Kiếm and central arena from visual-upgrade-2 are reused.

The complete roster is **74 forms**: 8 heroes, 20 invasion creeps, 24 dungeon creeps, 7 forms of 5 wave bosses, 11 helpers/minions, 4 dungeon bosses. Tây Độc has standing/crouched human forms; Vương Trùng Dương has two phases. A crouched Tây Độc remains human. The snake pedestal has coil poses and stays stationary in the preview. Hồng Liệt's cannon is an independently rendered scene prop.

`catalog.json` records old atlas/frame identity, original hashes, native heights and the eight scene themes. `references/` contains enlarged identity crops only, never replacement animation artwork. `raw/` contains 73 original twenty-cel ImageGen actor sheets and sixteen scene sources. `generation-jobs.json` preserves exact prompts, reference roles, output paths, dates and repair history. `PROVENANCE.json` summarizes origin and scope. Rejected dog artwork remains under `rejected/` and is never exported.

## Export

Run `pnpm assets:export:renovation`. Python/Pillow/NumPy only **measure and validate** images. Aseprite performs cropping, transparency cleanup, bilinear native-scale reduction, atlas assembly and editable-source export. Its nested JSON userdata must be copied to ordinary Lua tables when writing runtime metadata.

The measurer identifies connected silhouettes rather than assuming generated poses sit exactly inside equal grid rectangles. This preserves blades, hair and tails crossing guessed grid boundaries. Nearby disconnected costume pieces are retained. The exporter preserves original edge alpha near the solid drawing and removes distant background haze; reduction restores smooth connected miniature contours. Source RGBA files remain untouched.

Each new actor has 20 real source cels: four facings × (one idle + four walk poses), on 320×256 canvases with foot pivot (160,224). The 88px hero target is rendered at scale1, camera zoom1; larger creatures retain their role size. Accepted Võ Đang Kiếm keeps its 192×160 canvas, foot pivot(96,128), and original atlas. No new attack/cast/death/VFX clips are claimed by this preview.

Each new arena has a 1478×1064 ground and six separate 384×384 props with foot pivot(192,368). Y-depth uses actor and prop feet. Scenes: Rừng Trúc, Sa Mạc, Bãi Biển, Địa Ngục, Chu Bá Thông, Hoàn Nhan, Kim Luân, Cổ Mộ; accepted hub additionally available.

## Review and status

Open `/renovation-preview.html`. Use Chọn bộ hình to select scene/group/actor; arrows move the selected actor, pose buttons set facing, Đi tại chỗ plays authored walking cels. Dense groups have pages of at most8 actors, preserving native sizes and keeping them clear of edge props. So với bản cũ displays equal visible height. All controls and menus stay inside the dominant game viewport.

`scripts/verify-renovation.py` checks roster completeness, nonempty frames, clipping, partial alpha, four distinct walk cels in every facing, scene PNG dimensions and frozen skill hashes. Live Phaser frame/timing/keyboard/scene checks and PNGs are under `assets/reviews/renovation-v1/`. Routine recording stays disabled.

Status is **candidate awaiting director review**, in an interactive art-only scene. The multiplayer client's normal artwork, combat, collision, skills, authoritative timing and encounter logic are retained. Approval and integration into a server-backed match are separate from this requested preview.
