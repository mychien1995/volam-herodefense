# School and boss skill renovation v3

The director accepted the pilot's visual style and authorized graphical renovation of all other schools and boss skills. The new raster batch is integrated as a candidate for normal-game review. Final director approval is separate. No server, skill data, tuning, rewards, collision or arena layout files change in this batch.

Three reported defects:

- **Chiết Mai Thủ:** the pale square existed in the source raster. A new alpha-clean source replaces its aura cells. The exporter retains tight edge alpha and removes sub-threshold noise; source-corner checks catch broad rectangular mattes. Five other generated effect sheets with the same defect were edited again before export.
- **Vạn Kiếm Quy Tông:** only the short startup selected the pilot body, after which the retained actor animation could show the old character. The real channel status now retains the new meditation body until channel expiry. Its authoritative radial projectiles remain unchanged.
- **Thất Tinh Kiếm:** the old decorative seven-sword orbit did not register to the four real frontal hits. Four slash cues now use the existing directional hand offsets, start at the actor, and follow the original four-hit spacing. Damage/range/aim do not change.

The native body renderer samples the retained action animator and redraws an authored pose. Its animation state continues to run; drawing never emits attacks or damage. Sampling uses the animator's original frame even after the visible texture changes. A finite route fallback handles Phaser single-cel progress. Weapon identity survives mixed-school skills. Held guards, stationary stomps, palms, meditation, swordless casts, weapon release and recoveries use appropriate semantic pose groups. Several skills share poses; this is not a unique fully painted sequence for every skill. Hurt/death remain from the previous batch.

Production consists of 29 new four-facing body groups (464 keyposes), four retained pilot body sheets (64 keyposes), and 50 new effect groups/cleanup sources (372 source cels). The runtime uses 33 native body atlases and 174 VFX replacement atlases, with 4,396 new frame references. VFX keep the old virtual dimensions, clip identities, durations, trim registration and emission routes. New packed JSON is selected for ordinary URLs and inline atlas loaders alike. The old PNG/JSON inputs remain intact for comparison and hash guards.

[Source instructions and exact prompts](../assets/source/renovation-v3/README.md) · [provenance](../assets/source/renovation-v3/provenance.json) · [asset/alpha checks](evidence/renovation-v3/asset-check.json) · [PNG comparison gallery](evidence/renovation-v3/review.html).

Focused iteration passed all 43 school skills and eight basics using two real clients, real A/Q input and server-owned legal loadout/target prerequisites. Boss iteration exercised all 91 distinct ability/phase fixtures across nine encounters, with appropriate actor forms and actual fixed-tick execution. Separate scoped retries fixed fixture projection assumptions for anonymized Bắc Cái forms and dungeon-prefixed actor IDs; these were test-harness defects, without changes to combat mechanics. Fixtures do not establish a natural full boss progression or every possible cancel/death/combination.

The final production matrix checks 43×4 skill cases, 8×4 basics, every boss ability plus representative other facings, and a six-client keyboard-combat/damage-agreement pass. Exact completion status, commands, failures/retries and measured scope are recorded in [the evidence report](evidence/renovation-v3/README.md). PNGs show actual Phaser output; live frame/state reports establish sampled motion and phase changes. No videos, animated images or screenshot traces are generated.

Comparison mode `renovationSkills=old` shows the pre-renovation skill rasters; `renovationSkills=v2` retains the accepted pilot before these three fixes. Default is v3. The same approved native-scale arena and locomotion remain in all modes. Use a new room on matching current services when reviewing.
