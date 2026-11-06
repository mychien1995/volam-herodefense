# Renovation v5 — skill feedback trial

Worktree `wip/m3d/visual-upgrade-2`. Original/approved PNGs and locks remain unchanged. New files are candidates for director review; automated PASS does not approve art.

## Delivered changes

| Request | Implementation |
| --- | --- |
| Hỏa Vân / Phi Long | Four-cel golden dragon heads, different native display sizes; real projectile headings, single left mirror. |
| Hàng Long Hỏa Vũ | Eight-cel full dragon; server forward24/orbit36/rise15/dive12ticks; fixed cast-time target point; one112px AoE landing hit, no flight hits. Matching impact and height shadow. |
| Hoành Tảo | Ground ring centre registered at caster feet. |
| Phá Giáp | Separate four-cel descending staff, contact/rebound driven by the actual strike; retained ground impact. |
| Cầm Long | Claw's authored emission ring is registered at the caster feet in four directions, with no added gameplay projectile. |
| Thiên Hạ Vô Cẩu | Original M3D cast/VFX restored. |
| Truy Hồn | Travelling blue semicircular dao energy, real projectile position/direction. |
| Liệt Phong | Retained raised blade pose; doubled slash, long blue linear fissure, no earth mound. |
| Bách Liệt | Ten actual sweep pulses, silver-blue wind cuts and peach petals; looping foot wind; four alternating arm/saber poses per direction. |
| Thái Cực | Transparent cyan ribbed dome, real radius; only creeps/bosses trapped, all allies pass, including when a boss tries a scripted dash. |
| Lưỡng Nghi | Original M3D yin-yang VFX restored through a dedicated alias; renovated caster body retained. |
| Thất Tinh | Seven real frontal strokes,3tick spacing; matching seven visual cues, no damaging eighth finisher. |
| Thiếu Lâm A | Left fist/right fist/front kick/roundhouse use distinct body cels. Retained semantic phase/progress fixes single-cel animation progress; roundhouse changes facing and emits a correctly oriented travelling crescent. |
| La Hán | Luminous ground ring during the actual guard status; hide lingering fist guard/ending layers. Forward punch projectile remains. |
| Vi Đà | New four-pose ground punch in four directions; retained earth eruption at real impact. |
| Tru Tà | Large upright semicircle reaches the actual frontal hit area and lasts650ms. |
| Lý Mạc Sầu | Original M3D actions/VFX except the renovated Băng Phách Ngân Châm; dedicated needle texture preserves the exception. |
| Cổ Mộ | Original male/female founder pair restored at their Tiled markers using M3D scenery art. |
| Hồng Liệt | Actual dash contact frames and180° slash restored; other renovated art remains. |
| Chu / Kim | Original M3D combat bodies/effects restored, including minions; renovated idle/walk retained. |
| Boss test mode | `pnpm dev:renovation:bosses`: development-only, five real encounters in order; level30/max skills/zero cooldown, invulnerable heroes, run×3, each valid boss hit−5% max HP. |
| School avatars | Four transparent portraits derived from approved V1 idle sprites, used in the pre-match selection cards. |

Normal game: client5546/server2946. Skill review: client5547/server2947. New boss review: client5548/server2948. These are separate processes/rooms. Append `?debug=1&skillPreview=1` to the review links. Skill review also supports `&renovationSkills=old` for original combat-art comparison. Launchers refuse occupied ports and production cheat flags are disabled server-side. Use a fresh room after restarting.

## Sources and verification

`assets/source/renovation-v5` retains raw built-in imagegen outputs, original prompts, the clean dome edit prompt, editable Aseprite files, export plan/Lua and SHA256 provenance. The first dome source was rejected for haze; clean export has a transparent interior. `assets/exports/renovation-v5` contains11 native PNG/JSON atlases (76cels) and four portraits. No recordings were created. Aseprite alone writes/resizes rasters; the Python validator only reads/compares them. Source PNG density is higher than the old44px body, with88px native standing-body reference and fixed200/320foot pivot. The crouching Vi Đà action intentionally becomes shorter.

Focused iterations used two actual Phaser clients, real keyboard casts, server-owned legal max-rank builds/durable targets, event/phase checks and peer replication. Final profile: `pnpm check:final --config playwright.renovation-v5.config.ts` covers17skills×4directions, four Shaolin A sequences, restored boss cast families, six real renderer clients and a separate first/fifth boss-mode entry check. `schools-runtime.json`, `basics-runtime.json`, `bosses-runtime.json`, `boss-matrix.json`, `wave-boss-mode.json` and final workflow timings are the authoritative results when present. Earlier failure/iteration reports are retained as diagnostics. Boss phase/placement and final-mode chapter prerequisites are labelled fixtures; these checks do not claim a natural five-boss victory. PNGs are actual gameplay zoom captures, not animation proof; frame/source/heading observations and real events accompany them.

Deterministic `node tools/renovation-v5-balance.mjs` compares legal ranks at levels1/6/15/30, seeds42/137/2026 and defense0/15; Hàng Long is locked at level1. Results in `balance.json` are cast comparisons, not a whole-game balance review. Seed42 Thất Tinh totals at defense0: old/new100/98,180/182,272/273,392/392; at defense15:88/84,156/154,236/238,340/343. Seven strokes last18ticks between first/last hit instead of15. The dragon replaces line piercing with delayed AoE: the three-collinear-target fixture hits two nearby targets at landing, rather than all three along the line; it is not equivalent DPS or coverage. No additional balance compensation was introduced.

Final director approval remains pending. Review the actual running game and the PNGs, especially four-direction claw anchoring, ground contact poses and the dragon's four phases.

Final scopes are isolated so a failed assertion can be retried without rerunning completed artwork coverage: schools + six-client combat; precise two-client Shaolin motion; two-client boss sources/founder pair; boss-mode entry. The renderer frame history accompanies RPC samples for short Vi Đà cels under six-canvas load.

## Final measured results

Typechecks and all27 asset validators passed. The initial full unit/integration run had761passes/3failed contracts; all three were fixed and the focused five-file retry passed18tests, including the10new V5 cases. Workflow checks:18passed. Production Phaser scopes passed separately:68school casts,4Shaolin chains,59boss casts,2founder statues and six clients agreeing on20hit events. The review-mode first/fifth entry check passed; three fresh live rooms confirmed normal level1/no cheats, skill review level30 and boss review level30. Production bundle endpoint was restored to2946. See `verification.json`, the per-scope runtime reports and `live-services.json`. No failed pipeline report was relabelled successful.
