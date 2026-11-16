## Menu chính trước màn biệt danh · 2026-11-15

Vào game mở ô biệt danh. Hướng dẫn có ba tab Cơ chế chung, Môn phái và Boss. Cài đặt có âm lượng, công tắc tự đánh thường, lựa chọn Bàn phím/Chuột và mẫu con trỏ, dấu X. Nút Cài đặt trong trận mở các điều khiển tương ứng trong viewport và áp dụng ngay. Màn nhập biệt danh dùng Escape để về menu chính. Trong trận, con trỏ tùy chỉnh áp trên vùng canvas ở chế độ chuột; dấu X nằm tại tọa độ thế giới đã bấm.

## Campaign balance và thử lại boss — 2026-11-06

Popup đánh lại và số lượt hồi sinh nằm trong viewport, tái sử dụng khung UI hiện tại. Server xác nhận electorate/countdown/phiếu và giao dịch; modal chặn input gameplay. Ballot boss là ngoại lệ server pause được director duyệt; inventory/shop thông thường vẫn không pause. [Quy tắc, cấu hình và kiểm chứng](docs/CAMPAIGN_BALANCE_2026_11_06.md).

## Tab Chế tạo và icon Cái Bang — 2026-11-05

Tab Chế tạo của Thương Gia hiển thị cấp trang bị, số nguyên liệu đang có, boss nguồn, phí và ba lựa chọn nhánh. Thành phẩm hiện trên búp bê trang bị, nguyên liệu hiện trong Túi Đồ và Z hiển thị kỹ năng giày cùng thời gian hồi. Bộ icon raster Cái Bang thay hai đòn A, mười chiêu và Tiêu Diêu Công. Bản icon mới chờ duyệt hình ảnh trong Phaser.

## Fixed branch HUD — 2026-11-04

The pre-match lobby presents school followed by branch. In a match, skill upgrades sit directly above Q/W/E/R/T in the single world viewport. Hold O and press Q/W/E/R/T to upgrade the corresponding skill. Hovering or focusing a skill icon shows its description and current rank or unlock level in an in-viewport tooltip. For learned skills the tooltip shows the rank’s base damage, mana cost, and cooldown. T and unlearned ranks show their level requirement. Thiếu Lâm Quyền shows the current stance and F next to the bar. The entry dialogue is anchored to Tượng Võ Thần. The level-up effect reuses the existing original, approved four-frame Nam Đế ring atlas under assets/reviews/wave_boss_feedback_v01/exports, with a smaller scale and a new upward motion for the hero.

## Approved M3D feedback composition — 2026-11-03

Current runtime: **O = Võ Công, P = Phó Bản, Escape = close overlay / quit confirmation**,1/2 use health/mana potions, Shift dash. Remove Đồng Đội Kết Nối. Keep dash charges and the unavailable shoe-Z slot together in the in-viewport hotbar; hotkey badges are directly below utility buttons. Creep destinations including Hell are always private; bosses shared, with no access selector. Boss cards use arena backgrounds in order Lý Mạc Sầu/Hồng Liệt/Chu Bá Thông/Kim Luân, with centered I mechanism controls. Solo omits summon popup; multiplayer help follows real30s invitation state. Boss death/life/spectator/pause behavior is specified in GAME_DESIGN's latest override. The future personal-material/Long Châu inventory design below remains separate from retained runtime boss rewards. No persistent exterior panel or camera shrink is introduced.

## Potion hotkeys — 2026-11-02

Confirmed: **1 uses a health potion, 2 uses a mana potion**, also on numpad. Bottom-left potion buttons show their key badges and accessible tooltip/help. Both keys follow the same smallest-size-first action as mouse HUD use. Gameplay keys release ownership to open menus and text inputs; holding a key does not auto-drink. Existing full-viewport layout and shared5s cooldown remain.

## Inventory/merchant/Z concept approval and integration — 2026-11-02

The director approved v01 and requested integration. [Runtime UI report](docs/INVENTORY_HUD_INTEGRATION.md) records the in-viewport DOM overlay in the Phaser client, modular icons/frames, live gold/stats/rewards and backend limitations. Tabs/selection work; unavailable purchases/equipment/Z cannot fabricate state. Earlier concept-only notes below describe the original delivery stage, not runtime evidence or another approval gate.

## Inventory/merchant/Z design proposal — 2026-11-02

[HUD concept v01](docs/INVENTORY_MERCHANT_HUD_DESIGN.md) proposes five in-viewport mockups and interaction/state/responsive specifications for merchant, inventory and auxiliary Z from crafted boots. It is a static imagegen concept set awaiting director review, not runtime screenshots or implemented functionality. The existing global HUD is shown for context; no retained game art or backend is changed. Values in images are illustrative, not approved tuning.

Mechanics follow [inventory v2.0](ITEMS_AND_CRAFTING.md): four typed slots (weapon/armor/hat/boots), no necklace, no resale/trade/transfer or boss rolls; personal materials and first-clear Long Châu. Z is separate from QWER, with Thanh Tâm replacing healing boots. Potion cap/sharing, inventory capacity, numerical values and PvP normalization remain open. Older menu rows below are updated to this target design; retained encounter implementations require a separate migration.

## Boss dungeon cards — 2026-11-01

Lý Mạc Sầu / Cổ Mộ Phái is a destination card in the same grid and at the same level as Hoàn Nhan Hồng Liệt and Chu Bá Thông. All share destination selection and the existing Enter button; boss destinations always use the shared instance. No separate boss-entry button belongs in the options row. Reuse the approved Cổ Mộ illustration only as its menu thumbnail; the playable map remains the retained tilemap.

## Small gameplay UI amendment — 2026-10-31

Current user changes supersede older English copy and utility order: Vietnamese UI, Quit first at the left edge of the existing utility group, then Settings/Phó Bản/Thương Gia/Lôi Đài. Quit opens an in-viewport confirmation with Stay/Leave actions. O toggles Võ Công; P toggles Phó Bản without intercepting text/select input or other modal ownership. Dungeon doors use proximity plus Space, with an in-viewport prompt; portal clicks no longer exit. Local death desaturates the world canvas while the respawn message and HUD stay readable.

School selection retains four portraits but shows only element, brief identity and branch names; Leave left/Confirm right and all six roster entries fit the supported desktop views without scrolling. Võ Học shows Default/Custom, branch and slot ranks using retained icons. Default starts new players with automatic left-to-right point allocation; Custom retains existing manual controls. See docs/SMALL_GAMEPLAY_CHANGES.md for limits and acceptance.

# Võ Lâm Hero Defense — In-game UI / UX specification v1.4

## ART-01 compact HUD amendment — 2026-10-30

The current director request supersedes the older HUD arrangement for the arena: top-left live portrait/name/level/HP/MP/EXP, top-right exactly Settings/Quit/Phó Bản/Thương Gia/Lôi Đài, bottom-left inventory and live gold, bottom-center A/QWER. The arena has no persistent center title/status banner, room chip or minimap in this slice. Utility buttons open the existing in-viewport menus; Quit leaves the real room, Settings exposes controls, fullscreen, skill-loadout and party/connection access. M1 has no quick-item backend or skill-rank state, so decorative potion counts and ranks are not shown. Menu contents retain honest disabled preview states where later gameplay is absent. `arena-hud.css` uses PNG frame/icon artwork over live DOM values. Runtime art approval is separate and pending; see docs/ART01_RUNTIME_REVIEW.md.

**Status:** CONFIRMED design direction, PROPOSED exact placements and dimensions. Effective 2026-10-29.

## 1. Intent — GAME FIRST, NOT A WEB DASHBOARD (CONFIRMED)

The game must feel like a **complete 2D pixel-art RPG**. Once a player joins a match, the **world is the main screen**. Health, mana, EXP, hotbar, gold, inventory, dungeon/merchant/crafting/skill menus, PvP waiting room, and boss loot rolls are **drawn over, or anchored within, the same game viewport**. Never shrink the playfield to make space for persistent web-app sidebars, a page header, a status column, or a separate dashboard below the game.

**The current Codex prototype screenshot is an anti-reference** (`assets/references/current_codex_dashboard_anti_reference.png`): title/description outside the game, map embedded on the left, persistent `Temporary practice room`, character stats, players, and training creeps on a right column, footer/tool text beneath. Replace this in-match presentation. It may survive only in an explicitly toggled developer debug overlay (off in regular gameplay).

**Positive visual references:** `assets/references/in_game_world_reference.png` for wuxia pixel-art scene composition; `assets/references/cai_bang_character_reference.png`, `thien_son_thieu_lam_character_reference.png`, and `vo_dang_art_direction_reference.png` for chibi character styling. These **are reference/concept sheets, not ready-to-import animated spritesheets or a finished UI atlas**. The sample in-game scene is an art target, not a pixel-perfect UI layout requirement. No borrowed proprietary assets.

## 2. Display hierarchy (CONFIRMED vs PROPOSED)

**Confirmed:** A single full-size responsive game viewport. World and camera render behind HUD and temporary interactive menus. In-match information is accessible in-game; no always-visible external HTML panel. Mouse usable for NPC/menu/inventory, arrow keys move, `A` basic attack, `QWER` abilities. Avoid click-targeted skills.

**Proposed placements**, subject to visual review:

- **Top-left:** hero portrait, school/name, level, HP and mana bars, small EXP progress (hover/tap details); keep reasonably compact.
- **Top-center:** statue HP and next raid countdown with wave number, warning indicators. High priority, visible even while browsing a dungeon or menu.
- **Top-right:** optional minimap with player/statue/NPC markers; optional multiplayer player-count icon. Minimap design is not a confirmed v1 gameplay feature.
- **Bottom-center:** `A` basic attack and `Q W E R` skill hotbar with icons, mana cost/rank, cooldown radial or numeric overlay, feedback when disabled. Small combo indicator for Thiếu Lâm Phát Động near hotbar.
- **Bottom corners:** gold/EXP indicators, compact in-world buttons for inventory, skills, options, and dungeon navigation as applicable.
- **Floating in-world events:** damage numbers, cast warnings, critical hits, enemy HP only where useful, loot outcome toast, wave start warning, personal respawn countdown.
- **The world remains visible** under the UI; all overlays styled consistently with chibi martial-arts pixel art.

Example only (not to scale):

```text
┌────────────────────────────────────────────────────────────────────┐
│ [Portrait] Cái Bang Lv12     [STATUE HP] Wave 6 · 02:35    [Map?]│
│ [HP ━━━━━━━] [MP ━━━━━]       [Invasion warning]                  │
│ [XP ━━━━━━]                                                        │
│                                                                    │
│                                                                    │
│         ┌──────────────────────────────────────────────┐           │
│         │      ARENA / DUNGEON PIXEL-ART WORLD        │           │
│         │       Players · NPCs · enemies · scenery    │           │
│         └──────────────────────────────────────────────┘           │
│                                                                    │
│ [Gold 1,250]             [A] [Q] [W] [E] [R]          [Bag] [Skill]│
└────────────────────────────────────────────────────────────────────┘
```

No static right sidebar, no HTML list of training creeps replacing in-world enemy HP, no giant page title above the match, no persistent footer outside the viewport. A dedicated lobby/create/join screen **before entering a match** may be implemented as a separate view; once playing, remove lobby/status scaffolding.

## 3. In-game menus (CONFIRMED placement, PROPOSED behavior details)

All menus and modals appear *within* the fixed game viewport or as full-viewport overlays while the match remains rendered underneath. These are **not additional columns outside the game**.

| Trigger | UI | Actions | Important restrictions |
|---|---|---|---|
| Click Phó Bản utility button / P | Dungeon selection window | Choose destination; creep private / boss shared automatically | Server validates alive/arena membership and availability; no NPC/proximity requirement; modal stays inside viewport |
| Click Thương Gia utility button | Shop window | Buy/upgrade four basics, buy potions; proposed tabs Trang bị/Bình dược/Chế tạo | Show server gold/prices and unavailable reasons; no resale/trade; no potion purchases inside dungeons |
| Click Crafting NPC or merchant crafting tab | Crafting window | Preview recipe, materials, gold cost, craft | Server validates ownership and crafting; no dupes |
| Click inventory icon (or future configurable key) | Inventory modal | Weapon/armor/hat/boots, backpack, item details and permitted equipment actions | No necklace, resale/trade/transfer; capacity/equip-location policies open; server authority |
| Click skill icon (or configurable key) | Skill loadout menu | Select A normal attack, equip QWER, allocate/reset skill points | Server permits change **only in arena**; dungeon/PvP read-only |
| Click PvP NPC | PvP setup / waiting overlay | Join team A/B, ready/start | No persistent web sidebar |
| Boss killed, eligible | Personal reward notification / claim view | Show personal material and once-per-boss Long Châu when earned | Damaged + present in boss instance at death; no rolls; capacity/claim edge cases open |
| Personal death | Respawn/countdown overlay | View countdown, return to arena | Shared match clock and statue invasion continue |

Modal rules:

- Show a **close button**, mouse dismiss control and (proposed) `Escape` to close, unless a result is actively resolving.
- When a modal opens, **suppress gameplay hotkeys** (arrow/A/QWER) while typing or using text inputs, or while modal input focus owns the controls. Do not accidentally attack when purchasing or rebinding skills.
- Do **not pause** the multiplayer server/game clock when a client opens inventory or NPC UI. Warn player if a wave is imminent.
- If server sends a raid warning or critical statue event, display a clearly visible notification **above the open menu** without stealing clicks unexpectedly.
- Menu position may be center or near a clicked NPC but must remain inside viewport bounds; use scroll regions and readable item details on small desktop viewports. Use explicit back/close navigation.
- Preserve keyboard attack/skills and mouse NPC interaction. Do not add mouse targeting.

## 4. Technical implementation (implementation choice, not mandated framework)

**Acceptable:** Phaser game world + Phaser HUD layers (`scrollFactor=0`) for compact HUD, AND/OR **HTML/CSS UI overlay absolutely positioned within the same relative-positioned game viewport wrapper** for complex inventories and shops. The HTML overlay is still *in-game* as long as it covers the canvas and never steals permanent page layout width/height. HTML is not forbidden; a dashboard is.

Suggested component tree:

```text
GameApplication
  PreGameFlow
    Landing | RoomBrowser | WaitingLobby | SchoolSelection
  GameViewport [position:relative; aspect-ratio policy; fills available screen]
    PhaserCanvas (world/camera; pixelArt/nearest-neighbor)
    InGameHudOverlay (fixed to viewport, does not scroll with world)
      HeroHud | StatueHud | RaidTimer | Hotbar | Notifications | OptionalMinimap
    ModalLayer (above HUD inside same viewport)
      Inventory | SkillLoadout | DungeonMenu | Shop | Crafting | PvPLobby | LootRoll
    DevDebugLayer (opt-in via dev flag; hidden in normal play)
```

Engineering constraints:

- Client UI is a **view** of validated server state; server remains authoritative for HP/MP/XP, gold, equipment, dungeon, loot, skill respec and raid state.
- World mouse clicks should find NPCs/hit interactive objects; UI mouse clicks should stop at UI instead of becoming world interactions.
- Coordinate input focus and pointer ownership; keep HUD noninteractive areas pointer-transparent so movement/interaction isn't blocked.
- All overlays must respond to viewport resizes and browser zoom (no position relative to page sidebar). Target desktop 16:9 initially; other desktop ratios must remain usable. Exact min resolution and scaling are not final.
- Separate rendering/simulation from UI: no UI dependencies in `game-core`, no new network trust. Reuse client state bindings; avoid rewriting combat.
- Pixel art rendering stays crisp; keep fonts readable, with wuxia-inspired frames/palettes and original icons. DOM fonts may use a carefully chosen readable pixel/bitmap-style face, with Vietnamese diacritics correctly supported (no missing glyphs).
- HUD and menu animations are client-side presentation; multiplayer world continues behind overlays.
- UI depth order above characters and VFX; world depth by feet/Y. Do not make NPC interaction UI disappear behind trees/buildings.
- Maintain room connect/reconnect indicators compactly in-game, not as permanent web application cards.

## 5. UI visual direction

- Original wuxia pixel-art interface: dark/wood/jade/bronze/red accents, crisp beveled/panel borders, small parchment windows if readable; match the beautiful game reference scene rather than dashboard styling.
- Main game view should be visually dominant. Keep each HUD region small enough to preserve sightlines, especially both statue invasion routes. Use opacity and responsive hide/collapse on narrow viewports.
- Highlight statuses with icons and tooltips, cooldown shading, and concise labels. The skill bar uses **icons and rank/cooldown state**, not a text-only table.
- Inventory is a visually recognizable grid of item icons; show four equipped slots, a separate backpack grid, item descriptions/rarity/upgrade level, gold, crafting recipe previews.
- Dungeon selection should show destination labels, solo/shared and creep/boss distinction, preview/difficulty info when available, and Enter/Cancel. Avoid a browser page navigation.
- Different hero school portrait and skill effects adhere to referenced chibi pixel-art standards.

## 6. Incremental refactor plan for existing Codex M1 game

1. **Audit existing app** and list all dashboard/side-panel/page-header/footer elements; identify where game state and callbacks are currently wired. Do not discard multiplayer functionality.
2. Create a **single responsive GameViewport** spanning the main screen, wrap Phaser canvas and overlay UI in that viewport; keep a separate pre-match lobby if needed.
3. Move current status/stats/actions into **in-game HUD**; expose existing HP, mana, EXP, level, gold, weapon mode, connected room, player count, training enemies where appropriate. Remove redundant right-hand cards and persistent page chrome.
4. Convert the existing Q/W skill text rows and A attack setting into **hotbar icons plus in-game skill/equipment menus**, retaining keybindings and server state.
5. Create one functional **inventory overlay** and one functional **Dungeon NPC menu** as representative interactions. If backend support for a feature is not implemented yet, clearly label it as preview/disabled and do not fake authoritative purchases/teleports.
6. Visual smoke test: 1280×720 and 1920×1080 (suggested) plus a narrower desktop window, with gameplay, menu open, and invasion warning. Test two clients, keyboard input, mouse NPC menu, modal input capture, network state. Capture actual screenshots and compare to user references.
7. Stop after UI refactor, report screenshots, tests, and remaining placeholders. Do **not** rewrite game rules, back end or assets without cause.

## 7. Acceptance criteria

- [ ] Game world fills the intended game viewport and is not squeezed by a permanent right column or page header.
- [ ] HUD for hero HP/MP/level/EXP, wave countdown/statue health, gold and hotbar is layered over world.
- [ ] Q/W/E/R and A keys still work during gameplay; icon and cooldown states are visible and synchronized.
- [ ] Inventory opens inside the game viewport; shows four equipment slots and backpack area (placeholder slots okay until gameplay implementation).
- [ ] Clicking Phó Bản opens an **in-game** menu and allows supported entry from anywhere in the arena while alive; closes cleanly and requires no NPC.
- [ ] Clicking UI does not unintentionally move/attack/activate skills; modal keyboard focus is safe.
- [ ] Server keeps simulating and waves/alerts remain visible while inventory/shop is open; no artificial multiplayer pause.
- [ ] UI stays usable with different desktop sizes; no off-screen modal/window or disappearing HUD.
- [ ] Real screenshots of both normal gameplay and one menu-open state are reviewed against `in_game_world_reference.png` and `current_codex_dashboard_anti_reference.png`.
- [ ] No change to authoritative gameplay logic and no invented feature claims (e.g. fake item purchase / dungeon entry).

## 8. Unresolved details (do not silently declare approved)

- Exact placement, size, pixel art frame aesthetics, gold/XP widget positions, and minimap inclusion.
- Keyboard inventory (`I` suggested) / skills (`K` suggested) / Escape bindings: confirm collision with existing game controls before implementing.
- Whether character and target HP bars are always shown or on interaction; item rarity colors; exact backpack capacity and scroll behavior.
- Menu display rule during active raids and whether the HUD changes based on solo/team mode.

The user has explicitly approved **in-world HUD and menus instead of external panels**, but has **not** approved every provisional pixel/layout specification.


## 9. v1.5 reference images to inspect before UI work

Before making or refactoring any in-match UI, inspect these files:

- `assets/references/central_arena_hub_reference.png` — full in-game hub composition.
- `assets/references/arena_battle_reference.png` — arena battle HUD composition.
- `assets/references/forest_dungeon_reference.png`
- `assets/references/desert_dungeon_reference.png`
- `assets/references/sea_dungeon_reference.png`
- `assets/references/hell_dungeon_reference.png`
- `assets/references/dungeon_selection_menu_reference.png` — desired dungeon menu overlay.
- `assets/references/merchant_shop_menu_reference.png` — desired merchant overlay.
- `assets/references/inventory_menu_reference.png` — desired inventory/equipment overlay.
- `assets/references/current_codex_dashboard_anti_reference.png` — anti-reference showing what not to do.

These references lock in the intended pattern:
- world fills the screen,
- HUD is compact and overlaid,
- bottom-center hotbar is iconic and always visible,
- top-left hero HP/MP/EXP block is compact and readable,
- top-right feature buttons are compact,
- minimap sits inside the viewport,
- inventory/shop/dungeon selection open as ornate in-game windows while the world remains visible behind them.


## Confirmed dedicated pre-game school selection — 2026-10-30

The current user correction supersedes school choices in the waiting lobby: **Landing (nickname only) → Room Browser (create/join) → Waiting Lobby (players/host/status) → host Start Game → dedicated School Selection → all confirmations → Main Arena**. School choices do not appear in the waiting lobby. Four canonical schools only: Cái Bang, Thiên Sơn, Võ Đang, Thiếu Lâm. Duplicate school choices are allowed. Players can change choices until confirmation, then their choice is locked. Confirmation progress is server state.

The existing Colyseus room owns WAITING_LOBBY, SCHOOL_SELECTION and IN_GAME, host ID, school IDs and confirmations. Only the host can request Start Game in the waiting lobby. Simulation/input and matchElapsedMs remain stopped until every participant is connected and confirmed. Players then spawn at level 1 with one point near the central statue in the same room, retaining their chosen school in both network/player state and the core hero. No persistent accounts or progression. Invasions are still an unimplemented M2 feature; future scheduling must use the IN_GAME clock origin, never room creation.

Disconnect safety: during selection retain a disconnected/unconfirmed participant and hold the barrier. Never auto-pick, expire, or silently start without that participant. Current clients can leave/recreate the room. Host migration, reconnect/rejoin grace, removal of absent participants and any timeout/auto-selection policy remain OPEN; no such policy is implemented. Waiting-lobby host loss disables starting; no silent host promotion.

School descriptions, passives and basic styles come from CONTENT_DATA.md. School-specific numeric starting values and starting skill assignments beyond the Cái Bang M1 prototype are not finalized; show that explicitly instead of inventing mockup statistics. Phase 1 stores/validates selections but does not implement M3 school combat or bulk school gameplay art: the existing M1 combat tuning and approved Cái Bang runtime visual fallback remain in the arena. Distinct school card portraits are concept illustrations only.
