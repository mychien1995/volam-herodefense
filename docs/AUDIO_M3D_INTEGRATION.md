# Approved audio integrated into milestone/m3d

The user approved integration of the delivered audio work into `milestone/m3d`.
The checkout was already on that branch; this is a scoped integration commit,
not a merge of unrelated worktrees.

Included: 129 approved synthesized clips and their WAV masters for Côn Luân,
Ngũ Độc and Đường Môn; independent music/SFX settings and one-time 15% SFX
preference migration; 44 user-supplied MP3 originals with decoded float WAV
archives/OGG exports, retaining the existing 43 mappings for the other four
schools. Source/approval hashes and reproducible production scripts are retained.

The rejected four-school synthesized trial is excluded from this integration.
It remains local historical evidence. Unrelated artwork review server changes,
validation metadata and existing untracked art/evidence are not staged.

Validation already performed on the final runtime:

- `pnpm check:final --config playwright.practice.config.ts tests/e2e/audio-settings.spec.ts`
  with session `original-audio-ogg-float-final`: PASS, 1237 unit/integration tests,
  all asset validators, production build and two Chromium cases. Runtime audio
  starts were observed for all eight original-school branches.
- Earlier three-school validation includes six real clients, local ownership,
  private-trap concealment, toggle/expiry/death/zone/disconnect cleanup, all active
  kits, summon cues and real server phase acknowledgements. Original failures
  and scoped test-only retries remain documented in the session evidence.

This integration changes only approval/repository metadata after those checks.
Staged Git blobs and checkout bytes are audited against all audio hash records,
runtime imports and catalogue/test dependencies before committing. Approved
manifest/generator bytes have explicit Git attributes to prevent newline changes.
No repeat of a passing gameplay suite is needed for staging/approval bookkeeping.

Integration audit result: 428 staged files. All 394 distinct approved/imported
audio and generator hashes matched both staged Git blobs and a real
`git checkout-index` export. Relative sound-module imports resolve from the
tracked/index tree. Rejected synthesis assets and unrelated modifications are
excluded. `git diff --cached --check` passed with exact-byte CRLF exceptions for
the approved manifests/generator, following the repository's approval policy.
