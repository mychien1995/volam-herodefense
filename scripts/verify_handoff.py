#!/usr/bin/env python3
"""Simple docs/skills integrity checker; does not imply gameplay is implemented."""
from pathlib import Path
import json
import re

root = Path(__file__).resolve().parent.parent
required = [
    "README.md", "AGENTS.md", "CODEX_START_HERE.md", "DECISIONS.md",
    "GAME_DESIGN.md", "CONTENT_DATA.md", "COMBAT_SYSTEM.md", "BALANCING.md",
    "ITEMS_AND_CRAFTING.md", "TECHNICAL_ARCHITECTURE.md", "ROADMAP.md",
    "ACCEPTANCE_TESTS.md", "OPEN_QUESTIONS.md",
    ".agents/skills/game-playtest/SKILL.md",
    ".agents/skills/combat-balance-test/SKILL.md",
    ".agents/skills/create-game-ability/SKILL.md",
]
missing = [path for path in required if not (root / path).is_file()]
assert not missing, f"Missing handoff documents: {missing}"
for rel in ("examples/match-config.example.json", "examples/ability.example.json", "examples/school.example.json"):
    json.loads((root / rel).read_text(encoding="utf-8"))
for rel in (x for x in required if x.endswith("SKILL.md")):
    raw = (root / rel).read_text(encoding="utf-8")
    assert re.match(r"^---\nname: [a-z-]+\ndescription: .+\n---", raw), rel
skills = (root / "CONTENT_DATA.md").read_text(encoding="utf-8")
# Count canonical skill table rows: each row starts with a snake_case backticked ID
rows = re.findall(r"^\| `([a-z0-9_]+)` \| \*\*", skills, re.MULTILINE)
assert len(rows) == 43, f"Expected 43 active skills, found {len(rows)}"
assert len(set(rows)) == 43, "Duplicate skill IDs"
for expected in ("Tiêu Diêu Công", "Bắc Minh Thần Công", "Thái Cực Tâm Pháp", "Dịch Cân Kinh", "Như Lai Niết Bàn", "Thiên Hạ Vô Cẩu", "Bách Liệt Thiên Kích", "Vương Trùng Dương"):
    assert expected in ((root / "GAME_DESIGN.md").read_text(encoding="utf-8") + skills + (root / "DECISIONS.md").read_text(encoding="utf-8")), expected
config = json.loads((root / "examples/match-config.example.json").read_text(encoding="utf-8"))
assert config["defense"]["regularWaveIntervalSeconds"] == 180
assert config["defense"]["regularWaveCount"] == 20
assert config["character"]["maxLevel"] == 30
assert config["character"]["activeSkillSlots"] == 4
print(f"PASS: {len(required)} required docs/skills, 43 unique active skills, example configs valid, key decisions consistent")
