# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: gameplay.spec.ts >> fixed follow camera, eight-way movement and foreground occlusion
- Location: tests\e2e\gameplay.spec.ts:120:1

# Error details

```
Error: Route axis x at (1260,900)

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 8
Received:    128.954345703125
```

```
Tearing down "context" exceeded the test timeout of 90000ms.
```

# Page snapshot

```yaml
- main "Võ Lâm game viewport" [ref=e3]:
  - generic "Game canvas" [ref=e4]
  - generic "In-game HUD":
    - generic:
      - generic "Approved Cái Bang character artwork": "1"
      - generic:
        - generic:
          - strong: Lữ Khách
          - generic: Cái Bang
        - meter "HP":
          - generic: HP 106 / 160
        - meter "Mana":
          - generic: MP 100 / 100
        - meter "Experience":
          - generic: XP 0 / 60
    - navigation "Game menus" [ref=e6]:
      - button "Settings" [ref=e7] [cursor=pointer]:
        - generic [ref=e8]: Cài đặt
      - button "Quit" [ref=e9] [cursor=pointer]:
        - generic [ref=e10]: Thoát
      - button "Phó Bản" [ref=e11] [cursor=pointer]
      - button "Thương Gia" [ref=e13] [cursor=pointer]
      - button "Lôi Đài" [ref=e15] [cursor=pointer]
    - generic: Connected · vXkr5763P · 1 / 6
    - generic:
      - button "Túi đồ" [ref=e17] [cursor=pointer]
      - generic:
        - strong: "0"
    - region "Keyboard combat hotbar":
      - generic "Cái Bang Bổng · Ready": A
      - generic "Hỏa Vân Chưởng · Ready": Q
      - generic "Cuồng Long Loạn Vũ · Ready": W
      - generic "Chưa trang bị · Unavailable": E
      - generic "Chưa trang bị · Unavailable": R
      - button "◇" [ref=e19] [cursor=pointer]
    - paragraph [aria-hidden]
  - paragraph [ref=e20]: Lv 1 · HP 106/160 · MP 100/100 · XP 0 · Gold 0 · Skill points 1
  - generic:
    - strong: Tượng trấn phái
    - meter "Statue HP": 2000 / 2000
    - generic: Đợt 0 · Đợt 1 sau 01:44
```