# Boss sprite coherence rollout — 2026-11-20

User authorized applying renovate-game-sprite to bosses on wip/m3d/25d. Preserve gameplay/core/server/protocol/hitbox/skills/phase timing/HUD/F8 and existing approved assets; no recording. New versions are candidates, never automatically approved.

Inventory:9 main bosses,11 body identities including Tây Độc Cáp Mô and Vương phase2. Named supporting actors Mai Siêu Phong, Hoàng Dung, Hoắc Đô, Đạt Nhĩ Ba are audited for shared choreography/attachments; retain their art unless the boss integration requires a scoped correction. No unrelated creep/hero expansion.

| Batch | Scope | Status |
| --- | --- | --- |
|1|Đông Tà, sword/flute/summon body; retained Mai/Hoàng support|Complete8-facing candidate224cels; native PASS;2/6-client six-cast + real A defeat/corpse/F8 PASS|
|2|Tây Độc + Cáp Mô, Nam Đế, Bắc Cái|Four live directional master pilots PASS; complete8-source expansion and idle registration under validation; not enabled in committed runtime|
|3|Vương Trùng Dương phases1/2|Directional masters in production|
|4|Chu Bá Thông, Hoàn Nhan Hồng Liệt|Directional masters in production|
|5|Kim Luân Pháp Vương, Lý Mạc Sầu; retained support|Directional masters in production|

Current trace: locomotion from renovated-v1 body, actions via approved M3D V3/action overrides or native special renderers. A final body-only sampler at presentRenovatedBody covers actor-loop and dedicated boss renderers while retaining each effect owner. Complete states/facings and native/server behavior must be checked for each boss before calling it delivered. New source body density uses actual boss role height (124 for Đông Tà), fixed runtime scale.5 and feet pivot; never fit size to weapon/hair spread. Existing old asset bytes remain untouched.

Stages per batch: inspect normal runtime/source → representative live pilot → authorized facing/state expansion → native/source/hash validation → focused policy and real encounter checks with two clients and relevant six-client final → PNG before/after and playable review. User authorization permits staged continuation; do not stop after an internal pilot merely because it is a candidate. Keep failures and rerun affected stages only. Do not claim later batches complete while their status is inventory.

Pilot baseline first FAIL: a server-selected cast called outside the fixed step did not provide the event assumption used by the first probe. The corrected baseline verifies peer replicated cast activeAt/released state; before-ack PASS. Candidate idle/walk observed, then partial-direction action assertion FAIL because normal sword travel can leave the one authored direction. No gameplay facing/path change; full8facings are the next prerequisite. Keep both original reports, do not call the partial run full PASS.

Batch1 delivery: retained before-ack baseline, lifecycle2-client and party6-client reports. All six native casts replicated activeAt/released on each peer; fixed scale.5, idle4/walk4 observed; manual A killed a one-HP server-owned boss fixture and both death cels/cleanup observed. This is encounter presentation coverage, not natural campaign progression/balance. Old four-facing action direction selection is preserved; idle/walk/reactions gain8facings. Corpse owner in dong-ta-art explicitly routes through the canonical body; supporting actors retained. F8 remains the existing world-depth comparison; boss body legacy baseline is available via bossCoherence=0.
