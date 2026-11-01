# Retained original Kim Luân art sources

PNG sources in generated/ are original AI-assisted project rasters produced with the built-in image_gen tool on2026-11-01. No external game pixels were sampled. These are flattened source PNGs, not claimed layered Aseprite work.

generation.json contains source/export definitions and selected prompts. requests_batch_02.json retains initial locomotion/action/material prompts; source_prompts_supplement.json retains the effects/props/elephant prompts; safe_requests.json retains the actual gutter-correction requests. Original alpha/FX attempts are preserved and selection is explicit. Generator-request timestamps were retained where available; do not infer accurate service latency from completion observations across the tool/context refresh.

Run prepare.py from the repository root, then verify.py. The existing Hoàn Nhan alpha-gutter exporter is reused with --base/--out. Its old defaults are unchanged. No script draws replacement character/environment/VFX art, launches generation, records animation or changes the game/server.

Outputs: assets/exports/bosses/kim_luan_phap_vuong_v01/.
Live Phaser art review, verification and remaining limitations: assets/reviews/bosses/kim_luan_phap_vuong_v01/README.md.

Status: prototype_pending_director_review. No final approval, production dungeon integration or server-mechanic acceptance is inferred.

Feedback01 adds4true back-facing elephant gait cels and4thin shockfront phases; prompts and correction attempts are retained. Original262art/atlas files remain byte-identical. Current220cels include12props; playback184frames/53clips. New sources remain pending director approval; no server integration. See feedback_01/final_check.json in review folder.
