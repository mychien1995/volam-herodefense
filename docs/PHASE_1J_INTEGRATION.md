# Phase1I +1J — final arena creeps Waves17–20

**Arena Creep production track finished through Wave20. Final pipeline: PASS in376.23s.** All four new enemies are produced, integrated and runtime-verified. Typechecks,2 workflow tests,226 unit/integration tests across20 files, production build, all9 configured asset validators and1 complete six-client browser scenario passed.

The current user automatically approves the generated concepts and immediate production without intermediate approval. Independent final runtime director approval is not claimed.

| Wave | Enemy / texture | Production directory | Body target / canvas / feet |
| --- | --- | --- | --- |
|17|Ảnh Ma / creep_shadow_assassin|assets/sprites/creeps/arena/anh-ma/|48px /128×112 /64,88|
|18|Ma Tướng Thiết Giáp / creep_armored_demon_general|assets/sprites/creeps/arena/ma-tuong-thiet-giap/|58px /160×144 /80,112|
|19|Huyết Ma Pháp Sư / creep_blood_demon_warlock|assets/sprites/creeps/arena/huyet-ma-phap-su/|52px /144×128 /72,100|
|20|Ma Vương Tiên Phong / creep_demon_vanguard|assets/sprites/creeps/arena/ma-vuong-tien-phong/|66px /160×144 /80,112|

[Master concept](../assets/concepts/arena-creeps/waves-17-20/arena_creeps_17_20_concept_sheet.png) provides four views, equipment, palettes, attack poses and Cái Bang scale. [Concept manifest](../assets/concepts/arena-creeps/waves-17-20/concept_manifest_v1.json) records automatic approval and exact source hash. No existing Phase1I concept was present.

Each directory has64 transparent frame PNGs, spritesheet.png, atlas.json, a64-cel editable Aseprite source, retained generated pose PNGs/requests, extraction spans and provenance manifest. Four facings each have idle2,walk4,attack4,hurt2,death4:256 character cels/80 clips. Cast/release, overhead and impact are keyposes of existing basic attacks. Exact keys follow texture:state:direction and appear in each manifest plus the [runtime catalogue](../assets/arena_creeps.manifest.json).

[Separate VFX](../assets/sprites/creeps/arena/waves-17-20-production/effects/) has28 distinct cels/seven clips on arena_creep_final_fx: shadow_contact,general_contact,blood_contact,vanguard_contact,blood_projectile,shadow_trail,vanguard_aura. [Production/provenance README](../assets/sprites/creeps/arena/waves-17-20-production/README.md) records references, corrections, source generation, Aseprite assembly and commands. Dedicated motion poses were generated from the concepts; concept figures were not cut into a fake atlas.

## Integration and limits

Asset preparation extends the existing pack through20. Existing art registry, ArenaScene, ArenaCreepEffects and per-instance CreepPlayback consume the new metadata unchanged. Confirmed combat events control attacks/hits/deaths; native scale1, nearest filtering, cardinal facing, fixed feet and Y-depth remain. No production server/core/data, balance, wave clock/spawn, collision, HUD, environment or older artwork was edited. Legacy Phase1H checks now count their own first16 entries while allowing later catalogue entries.

**Stock invasion AI remains melee.** Warlock casting presents the existing creep_strike. Separate blood projectiles follow existing authoritative state; two orthogonal zero-damage server-fixture shots verify location, orientation, frames and cleanup. No ranged AI, dash, new status, shockwave damage or other mechanic was added.

## Measured checks

- New PNG/atlas/provenance verifier: PASS,256 distinct frames/80 tags,28 FX frames/seven tags, safe bounds/binary alpha, exact atlas pixels, timing, editable sources, concept/source hashes, runtime copies and1,285 protected earlier inputs.
- Existing Phase1H verifier: PASS, all prior character/VFX exports and1,145 protected inputs.
- Focused presentation tests: PASS, five tests.
- First full browser iteration observed all256 frames/80 clips and28 FX frames, native pivots/depth/occlusion, with zero browser errors. Cleanup failed because stationary level1 players died/respawned away from a survivor. Failure PNG/JSON retained.
- First pursuit diagnostic exposed a test-only incorrect player-stat field; corrected to configured speed. Failure evidence retained.
- Focused six-client combat diagnostic: PASS,72 actual keyboard pursuit decisions, all four genuine kills, natural hurt/death completion, rewards/shared HP, all28 FX frames and cleanup, unchanged enemy stats and invasion definition.
- Final command: pnpm check:final --config playwright.arena-creeps-final.config.ts — PASS in376.23s. Browser stage238.51s; all256 character frames/80 clips and28 effect frames/seven clips observed. Real kills/hurt/death/rewards, independent actors, shared HP/movement, native zoom, tree depth and cleanup passed with zero browser errors. Existing large-client-chunk warning remains.

Tests own localhost2598/5198 and six real Chromium contexts. A server-only fixture triggers stock-stat Waves1–20 through the unchanged director and holds existing stun/action state for deterministic pose coverage. Natural combat removes those holds and uses real Arrow/A commands, without HP/damage/reward injection. This is accelerated visual verification, not a60-minute campaign or balance/performance benchmark.

## Visual review / evidence

Inspected all four approved creep master sheets, production cels from every Wave1–16 family, latest demon atlases, approved Cái Bang gallery, actual Võ Đang reference and rejected2026-10-29 runtime screenshot. The obsolete Võ Đang alias is absent as already documented. Production preserves violet twin blades; cape/halberd; pale face/crimson headdress/crystal; and dark-gold heavy warblade silhouettes. Fine concept embroidery/rivets simplify at48–66px. Vanguard stays in Ngưu Ma's regular-creep size class.

Rejected raw sources remain. Corrections resolve missing/switched blades and staff-side continuity. A bounds check rejected one low-weapon-guard anchor; the boot-anchor fix was re-exported successfully. No primitive replacement art or video recording was created.

- [Concept → sprite → actual arena PNG](evidence/phase1j-integration/concept-production-arena-comparison.png)
- Individual comparisons: [Ảnh Ma](evidence/phase1j-integration/anh-ma-comparison.png), [General](evidence/phase1j-integration/ma-tuong-thiet-giap-comparison.png), [Warlock](evidence/phase1j-integration/huyet-ma-phap-su-comparison.png), [Vanguard](evidence/phase1j-integration/ma-vuong-tien-phong-comparison.png)
- [Four enemies in arena](evidence/phase1j-integration/arena-idle-down.png), [native1×](evidence/phase1j-integration/arena-native-1x.png), [left walk](evidence/phase1j-integration/arena-walk-left.png), [back walk](evidence/phase1j-integration/arena-walk-up.png), [death](evidence/phase1j-integration/arena-death-down.png)
- [Real combat](evidence/phase1j-integration/arena-natural-attacks.png), [projectile fixture](evidence/phase1j-integration/arena-projectile-renderer-fixture.png), [behind tree](evidence/phase1j-integration/arena-brute-behind-tree.png), [in front](evidence/phase1j-integration/arena-brute-in-front-of-tree.png)
- [Live observations](evidence/phase1j-integration/integration_verification.json), [focused combat](evidence/phase1j-integration/combat_diagnostic.json), [final log](evidence/phase1j-integration/final-check.log)
- [Exact modified/delivered file inventory](../assets/sprites/creeps/arena/waves-17-20-production/delivery_files_v1.json)

Evidence is static PNG, actual frame/event observations and logs. No WebM,MP4,GIF or video/trace playback was generated. Final runtime director approval remains separate.

No PNG/source/atlas/timing/pivot/runtime binding changed after the final successful pipeline. Comparison layout and review/status/inventory metadata were finalized separately; affected read-only asset/hash checks were rerun. Unrelated concurrent changes were preserved.
