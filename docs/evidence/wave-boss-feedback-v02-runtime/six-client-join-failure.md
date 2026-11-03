# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wave-boss-feedback.spec.ts >> six clients: two Phaser plus four SDK peers, full boss HP and natural combat/rewards
- Location: tests\e2e\wave-boss-feedback.spec.ts:417:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "SCHOOL_SELECTION"
Received: "WAITING_LOBBY"

Call Log:
- Timeout 15000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- main "Khung cảnh Võ Lâm" [ref=e3]:
  - generic "Khung cảnh trò chơi" [ref=e4]
  - generic "Thông tin trong trận":
    - generic:
      - generic "Chân dung Cái Bang": "1"
      - generic:
        - generic:
          - strong: Party 1
          - generic: Cái Bang
        - meter "Sinh lực":
          - generic: SL 0 / 0
        - meter "Nội lực":
          - generic: NL 0 / 0
        - meter "Kinh nghiệm":
          - generic: KN 0 / 60
    - navigation "Menu trò chơi" [ref=e6]:
      - button "Thoát" [ref=e7] [cursor=pointer]:
        - generic [ref=e9]: Esc
      - button "Cài đặt" [ref=e10] [cursor=pointer]
      - button "Phó Bản" [ref=e12] [cursor=pointer]:
        - generic [ref=e14]: P
      - button "Thương Gia" [ref=e15] [cursor=pointer]
      - button "Lôi Đài" [ref=e17] [cursor=pointer]
    - generic: Connected · s6G-oeCet · 6 / 6
    - generic:
      - button "Túi đồ" [ref=e19] [cursor=pointer]
      - generic:
        - strong: "0"
      - region "Bình mang theo":
        - button "Không còn bình máu · Phím 1" [disabled] [ref=e21]:
          - generic [ref=e22]: "1"
          - emphasis [ref=e23]: "0"
        - button "Không còn bình mana · Phím 2" [disabled] [ref=e24]:
          - generic [ref=e25]: "2"
          - emphasis [ref=e26]: "0"
    - region "Thanh kỹ năng chiến đấu":
      - generic "Cái Bang Bổng · Sẵn sàng": A
      - generic "Hỏa Vân Chưởng · Thiếu nội lực": Q
      - generic "Cuồng Long Loạn Vũ · Thiếu nội lực": W
      - generic "Chưa trang bị · Chưa mở": E
      - generic "Chưa trang bị · Chưa mở": R
      - status "Lướt · Shift":
        - generic: "2"
        - generic: Shift
        - progressbar "Hồi lượt lướt"
      - img "Z · Kỹ năng từ giày chưa mở":
        - generic: Z
      - button "Võ Công · O" [ref=e27] [cursor=pointer]:
        - text: ◇
        - generic [ref=e28]: O
    - paragraph [aria-hidden]
  - paragraph [ref=e29]: Cấp 1 · Sinh lực 0/0 · Nội lực 0/0 · Kinh nghiệm 0 · Vàng 0 · Điểm kỹ năng 1
  - region "Trước trận" [ref=e30]:
    - generic [ref=e31]:
      - heading "Phòng chờ" [level=1] [ref=e32]
      - paragraph [ref=e33]: Phòng s6G-oeCet · 6/6 người chơi
      - list [ref=e35]:
        - listitem [ref=e36]:
          - strong [ref=e37]: Party 1
          - generic [ref=e38]: ♛ Host · Connected
        - listitem [ref=e39]:
          - strong [ref=e40]: Party 2
          - generic [ref=e41]: Connected
        - listitem [ref=e42]:
          - strong [ref=e43]: SDK 5
          - generic [ref=e44]: Connected
        - listitem [ref=e45]:
          - strong [ref=e46]: SDK 3
          - generic [ref=e47]: Connected
        - listitem [ref=e48]:
          - strong [ref=e49]: SDK 6
          - generic [ref=e50]: Connected
        - listitem [ref=e51]:
          - strong [ref=e52]: SDK 4
          - generic [ref=e53]: Connected
      - paragraph [ref=e54]: Host bắt đầu để mọi người chọn phái.
      - generic [ref=e55]:
        - button "Bắt đầu" [ref=e56] [cursor=pointer]
        - button "Rời phòng" [ref=e57] [cursor=pointer]
      - status [ref=e58]
```

# Test source

```ts
  360 |               (await snapshot(a)).state.players[n.sessionId].dashCharges,
  361 |           )
  362 |           .toBeLessThan(hero.dashCharges);
  363 |         await fixture(a, 'stand', { player: n.sessionId, x: '800', y: '616' });
  364 |         await expect
  365 |           .poll(async () => (await snapshot(a)).state.players[n.sessionId].y)
  366 |           .toBe(616);
  367 |         await a.screenshot({ path: out + '/live-nine-moving-spinners.png' });
  368 |         await fixture(a, 'natural_bac_clones');
  369 |         for (const p of pages)
  370 |           await expect
  371 |             .poll(async () =>
  372 |               (await art(p)).bossShouts.active.some(
  373 |                 (x: any) => x.name === 'Mục Hạ Vô Nhân',
  374 |               ),
  375 |             )
  376 |             .toBe(true);
  377 |         await expect
  378 |           .poll(async () => (await art(a)).bacCai.view.forms.length)
  379 |           .toBe(8);
  380 |         expect((await art(a)).bacCai.view.dialogue).toBe('');
  381 |         report.cases.push({ boss, cloneShout: (await art(a)).bossShouts });
  382 |       }
  383 |       // Real server death prerequisite; generic retry must preserve statue HP and recall both clients.
  384 |       const hp = (await snapshot(a)).state.defense.statueHp;
  385 |       await fixture(a, 'wipe');
  386 |       await expect.poll(async () => (await arena(a))?.phase).toBe('retry');
  387 |       await expect
  388 |         .poll(async () => (await arena(a))?.attempt, { timeout: 15000 })
  389 |         .toBe(2);
  390 |       expect((await snapshot(a)).state.defense.statueHp).toBe(hp);
  391 |     }
  392 |     expect(errors).toEqual([]);
  393 |     report.errors = errors;
  394 |     report.status = 'PASS';
  395 |     await writeFile(out + '/two-client.json', JSON.stringify(report, null, 2));
  396 |   } catch (error) {
  397 |     await writeFile(
  398 |       out + '/two-client-failure.json',
  399 |       JSON.stringify(
  400 |         {
  401 |           error: String(error),
  402 |           errors,
  403 |           snapshot: await snapshot(a),
  404 |           presentation: await art(a),
  405 |         },
  406 |         null,
  407 |         2,
  408 |       ),
  409 |     );
  410 |     await a.screenshot({ path: out + '/two-client-failure.png' });
  411 |     throw error;
  412 |   } finally {
  413 |     await Promise.all(contexts.map((c) => c.close()));
  414 |   }
  415 | });
  416 | 
  417 | test('six clients: two Phaser plus four SDK peers, full boss HP and natural combat/rewards', async ({
  418 |   browser,
  419 | }) => {
  420 |   const contexts = await Promise.all(
  421 |       Array.from({ length: 2 }, () => browser.newContext()),
  422 |     ),
  423 |     pages = await Promise.all(contexts.map((c) => c.newPage())),
  424 |     a = pages[0]!,
  425 |     errors: string[] = [],
  426 |     sdkPeers: any[] = [],
  427 |     report: any = {
  428 |       scope:
  429 |         'Six real network clients (two production Phaser/keyboard plus four SDK/input peers), level30 legal builds and phase/spawn prerequisites. Full boss HP and natural AI; no god mode, injected hits or damage/HP reduction. Six same-machine renderer load was not accepted.',
  430 |       bosses: [],
  431 |     };
  432 |   for (const p of pages) p.on('pageerror', (e) => errors.push(e.message));
  433 |   await mkdir(out, { recursive: true });
  434 |   try {
  435 |     await joinWaiting(a, 'Party 1');
  436 |     const room = (await snapshot(a)).roomId;
  437 |     await joinWaiting(pages[1]!, 'Party 2', room);
  438 |     const network = new Client(
  439 |       `ws://127.0.0.1:${process.env['VOLAM_QA_SERVER_PORT'] ?? 2904}`,
  440 |     );
  441 |     const peers = await Promise.all(
  442 |       Array.from({ length: 4 }, (_, i) =>
  443 |         network.joinById<LobbyState>(room, {
  444 |           nickname: 'SDK ' + (i + 3),
  445 |           protocolVersion: PROTOCOL_VERSION,
  446 |         }),
  447 |       ),
  448 |     );
  449 |     sdkPeers.push(...peers);
  450 |     for (const peer of peers) {
  451 |       peer.onError((code, message) => errors.push(code + ':' + message));
  452 |       peer.onMessage('combat-event', () => {});
  453 |       peer.onMessage('command-rejected', () => {});
  454 |     }
  455 |     await expect
  456 |       .poll(async () => Object.keys((await snapshot(a)).state.players).length)
  457 |       .toBe(6);
  458 |     const confirming = Promise.all(
  459 |       peers.map(async (peer, i) => {
> 460 |         await expect.poll(() => peer.state.phase).toBe('SCHOOL_SELECTION');
      |                                                   ^ Error: expect(received).toBe(expected) // Object.is equality
  461 |         peer.send('lobby-action', {
  462 |           action: 'select',
  463 |           schoolId: ['thien_son', 'vo_dang', 'cai_bang', 'thieu_lam'][i],
  464 |         });
  465 |         peer.send('lobby-action', { action: 'confirm' });
  466 |       }),
  467 |     );
  468 |     await startTogether(pages, ['thien_son', 'vo_dang'], 60000);
  469 |     await confirming;
  470 |     const sequences = peers.map(() => 0);
  471 |     for (const boss of ['dong_ta', 'tay_doc', 'nam_de', 'bac_cai']) {
  472 |       await fixture(a, 'spawn', { boss, natural: '1' });
  473 |       await expect.poll(async () => (await arena(a))?.bossId).toBe(boss);
  474 |       const start = await snapshot(a),
  475 |         key =
  476 |           boss === 'tay_doc'
  477 |             ? 'tay_doc_boss'
  478 |             : boss === 'nam_de'
  479 |               ? 'boss_nam_de'
  480 |               : boss,
  481 |         hp = JSON.parse(start.state.defense.waveArena).bossMaxHp,
  482 |         started = Date.now();
  483 |       const gold = Object.fromEntries(
  484 |         Object.entries(start.state.players).map(([id, h]: any) => [id, h.gold]),
  485 |       );
  486 |       let samples = 0,
  487 |         driving = true;
  488 |       await Promise.all(pages.map((p) => p.locator('#game canvas').focus()));
  489 |       const sdkDrivers = Promise.all(
  490 |         peers.map(async (peer, i) => {
  491 |           let pulse = 0;
  492 |           const send = (command: any) =>
  493 |             peer.send('input', {
  494 |               protocolVersion: PROTOCOL_VERSION,
  495 |               sequence: ++sequences[i]!,
  496 |               ...command,
  497 |             });
  498 |           while (driving) {
  499 |             const h = peer.state.players.get(peer.sessionId);
  500 |             const view = JSON.parse(
  501 |               peer.state.bacCai.get('arena')?.snapshot ?? 'null',
  502 |             );
  503 |             const target =
  504 |               boss === 'bac_cai'
  505 |                 ? view?.forms?.length
  506 |                   ? view.forms[i % view.forms.length]
  507 |                   : view?.boss
  508 |                 : peer.state.creeps.get(key);
  509 |             if (h && h.hp > 0 && target) {
  510 |               const qte = JSON.parse(
  511 |                 peer.state.namDeControls.get(peer.sessionId)?.payload ?? 'null',
  512 |               )?.qte;
  513 |               if (qte?.state === 'pending')
  514 |                 send({
  515 |                   kind: 'nam-de-key',
  516 |                   castId: qte.id,
  517 |                   index: qte.index,
  518 |                   key: qte.keys[qte.index],
  519 |                 });
  520 |               else {
  521 |                 const d = Math.hypot(target.x - h.x, target.y - h.y),
  522 |                   range =
  523 |                     m1Config.basics[h.basicId]?.effect.mode === 'projectile'
  524 |                       ? 135
  525 |                       : 38;
  526 |                 send({
  527 |                   kind: 'move',
  528 |                   x: d > range ? Math.sign(target.x - h.x) : 0,
  529 |                   y: d > range ? Math.sign(target.y - h.y) : 0,
  530 |                 });
  531 |                 send({ kind: 'basic' });
  532 |                 if (pulse % 5 === 0)
  533 |                   send({ kind: 'cast', slot: (Math.floor(pulse / 5) + i) % 4 });
  534 |               }
  535 |             }
  536 |             pulse++;
  537 |             await new Promise((resolve) => setTimeout(resolve, 100));
  538 |           }
  539 |         }),
  540 |       );
  541 |       const drivers = Promise.all(
  542 |         pages.map(async (p, i) => {
  543 |           let pulse = 0;
  544 |           while (driving) {
  545 |             await p.keyboard.press('a');
  546 |             if (pulse % 8 === 0)
  547 |               await p.keyboard.press(
  548 |                 ['q', 'w', 'e', 'r'][(Math.floor(pulse / 8) + i) % 4]!,
  549 |               );
  550 |             pulse++;
  551 |             await new Promise((resolve) => setTimeout(resolve, 100));
  552 |           }
  553 |         }),
  554 |       );
  555 |       const held = pages.map(() => new Set<string>());
  556 |       try {
  557 |         while (Date.now() - started < 100000) {
  558 |           const s = await snapshot(a),
  559 |             view = JSON.parse(s.state.bacCai?.arena?.snapshot || 'null');
  560 |           if (!JSON.parse(s.state.defense.waveArena ?? 'null')) break;
```