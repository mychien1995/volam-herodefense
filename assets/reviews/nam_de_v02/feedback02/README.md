# Nam Đế feedback02 — warning, slow rotation and dialog dismissal

Prototype in `wip/m3d/nam-de`; standalone Phaser review only, pending director approval.

Liên Hoàn Nhất Dương Chỉ now releases sixteen rays sequentially. Each fixed lane is warned for 0.9s; releases are spaced 0.8s apart; only one active ray exists at a time. The boss takes 12.8s to turn through one circle, advancing through the four retained cardinal facings in order. The preview lasts 16s. These numbers are presentation defaults, superseding feedback01's near-simultaneous eight-direction volleys. Camera perspective and original character art remain unchanged.

The pressure-point dialog is visible only while the input challenge is pending. The tenth correct key or first wrong key closes it in the same input event. Wrong-input explosion, HP backlash, boss heal and stun continue in the world after the dialog is hidden. A replay creates a fresh challenge; expiry also dismisses the dialog.

`export_feedback02.py` crops transparent padding from the four original line-warning PNG cels and writes this small atlas. Exact source/crop/output hashes are in `manifest.json`; original files are preserved. `verify_assets.py` checks the crops against actual source pixels and the atlas. No procedural final VFX, new character generation or recording is used.

Current evidence: `../evidence/feedback02/barrage-warning.png`, `barrage-single-shot.png`, `success-dialog-closed.png`, `wrong-dialog-closed-explosion.png`, `feedback02-verification.json` and the broader `verification.json`. Prior feedback01 evidence stays historical.

The focused browser check samples the entire turn, bounds angular speed, limits simultaneous beams/warnings, checks each warning-to-release delay/direction, and presses real keys to verify immediate dialog dismissal and retained explosion/stun. Visual witnesses are local actors; this is not authoritative encounter or multiplayer combat acceptance.
