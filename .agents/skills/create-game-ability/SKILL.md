---
name: create-game-ability
description: Add or revise a Võ Lâm Hero Defense active skill, innate passive or normal attack with data-driven effect definitions, server-side execution, client visuals and deterministic regression tests. Use when the user requests a new school skill or ability change.
---

# Skill addition workflow

1. Read `CONTENT_DATA.md`, `COMBAT_SYSTEM.md`, `DECISIONS.md`, `AGENTS.md` and relevant school style. The exact canonical `nameVi` and school ID must be preserved; create stable ASCII `id`.
2. Verify the new skill is truly requested, not a draft brainstorm. If changed from existing behaviour, document it in the change log and update catalogue.
3. Prefer a validated data definition composed from existing effect handlers (`damage`, `slow`, `stun`, `disarm`, `silence`, `pull`, `shield`, `dash`, `heal`, `projectile`, etc.). If a custom mechanic is essential, implement narrow reusable handler in deterministic `game-core` instead of duplicating logic in client/server or a giant conditional.
4. Define input targeting mode from `facing`, `self`, `areaAroundSelf`, `nearestEnemyAtCast`; **never add mouse aiming or client-authoritative hit logic**. Include rank costs, cooldowns, mana, control resistance, VFX/SFX asset keys and interaction with crit/cleave.
5. For Thiếu Lâm, verify same-target Phát Động with cleaved secondary hits. For Cầm Long Công verify enemies can still move but cannot attack/cast; for Võ Đang kiếm khí verify projectiles fly straight, not tracking.
6. Add deterministic unit tests for hit/miss, range, rank gates, cooldown/mana, status duration, bosses, team vs enemy interaction, server validation and any combo behavior. Add browser smoke checks once assets/UI exist.
7. Ensure changes do not silently alter ability slots (4), max level (30), controls (arrow/A/QWER), school passives, wave schedule or loot rules. Show tests run and describe placeholder artwork if final assets don't yet exist.
