# Đông Tà integration into milestone/m3d — 2026-11-03

Director authorization: “duyệt, tích hợp vào milestone/m3d”. Approved runtime/evidence hashes remain in `evidence/dong-ta-runtime/director-approval.json`; numerical tuning stays provisional. The original feature commit is38518ba6, based on46d36869. The target was3e09dcde,16 commits ahead, including approved M3D gameplay/visual rework, Hell, merchant/inventory and potion controls. The main checkout's untracked `boss-prompt.txt` is outside the merge scope and is preserved.

## Reconciliation

The merge was assembled in the existing Đông Tà worktree before updating the target. Both feature sets are retained in actor rendering/loading, the server room, core configuration, exports, asset preparation, protocol and design ledgers. Protocol22 preserves protocol21 fields and adds Đông Tà state/effect origins; old protocols are rejected. The target's controls, Ca Diệp/Sư Tử names, Vô Ảnh buffering, private creep/shared boss policy, dungeon life ledger, Chu wine, Hell, merchant/potions and future inventory-v2 boundary remain.

Focused failing tests first reproduced dungeon pause preventing wave5 entry, a recalled spectator remaining unable to act, and a real Nhân Kiếm recast escaping the court. Ready/approaching/active Đông Tà is an explicit exception to dungeon-only exterior pause. Forced recall clears spectator/invitation state while retaining dungeon revival debt, reconnects land inside the court, and unsafe blink destinations are rejected without consuming the sword/recast cost. Ordinary boss dungeons retain their pause/revival rules. No new tuning or artwork is introduced.

All630 approved source inputs remain byte-exact. Index verification caught15 CRLF metadata files that would normalize on fresh checkout; scoped `.gitattributes` overrides and explicit renormalization preserve original bytes without changing lock hashes. Historical approval/runtime reports remain. Merge QA uses separate evidence paths under `docs/evidence/dong-ta-m3d-merge/`.

## Validation

The focused seven-file regression run passed60 tests, including real-cast blink, pause/recall/spectator/reconnect, Đông Tà combat/SDK authority and existing boss-party/mobility rules. Final stage details and runtime input hashes are in `docs/evidence/dong-ta-m3d-merge/verification.json`. No recordings/video/trace playback.

### Final verified coverage

All587 unit/integration tests across57 files,18 workflow checks, project/tool typechecks, production build and17 asset validators passed on the reconciled runtime. Đông Tà's final six-client test passed in150.64s with full bossHP on the final attempt,109clips/436frames, zero client errors, actual keyboard combat/rewards and restored arena/collision. Both final PNGs were opened and visually compared with the approved source; unchanged chibi art/feet pivots, the existing full viewport and current M3D overlays are retained.

The old DongTa browser config still selected obsolete M2A tests requiring private/shared creep radios; the final invocation records those two failures honestly. The profile now selects the current encounter test, and current M3D regressions provide menu/control, sword hold/blink/owner-burn and boss invitation/pause/revival/spectator coverage. The current M3D CaDiep fixture expected a third target350px away despite its273px base reach; it now places that target270px away and still requires three real hits. The corrected focused browser test passed after tool typechecking. No production reach or damage was changed.

The source approval and historical original-branch evidence remain intact. The192-run balance result is retained historical evidence, not a new balance claim for the latest milestone school tuning. All failure records are preserved; no failed pipeline report was rewritten as a success. The main-branch update is a no-ff merge of the validated integration line, preserving prior milestone history. Protocol22 requires refreshed server/client processes and a new room; no unrelated service is stopped by this task.
