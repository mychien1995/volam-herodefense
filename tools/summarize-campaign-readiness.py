"""Audit the frozen campaign readiness matrix and write a compact, honest report."""
from pathlib import Path
import collections
import csv
import hashlib
import json
import statistics

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tools/campaign-readiness.ts"
SOURCE_HASH = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
OUTPUT = ROOT / "docs/evidence/sessions/campaign-readiness-2026-11-27"
OUTPUT.mkdir(parents=True, exist_ok=True)
BOSSES = ["dong_ta", "boss_ly_mac_sau", "tay_doc_boss", "hong_liet_boss", "boss_nam_de", "chu_ba_thong", "bac_cai", "kim_luan_phap_vuong", "vuong_trung_duong"]
NAMES = ["Đông Tà", "Lý Mạc Sầu", "Tây Độc", "Hoàn Nhan Hồng Liệt", "Nam Đế", "Chu Bá Thông", "Bắc Cái", "Kim Luân Pháp Vương", "Vương Trùng Dương"]
WAVE_BOSSES = [BOSSES[i] for i in [0,2,4,6,8]]
BOSS_GOLD = [0,180,320,570,770,1120,1420,1870,2270]
BRANCH_NAMES = {"cai_bang_bong":"Cái Bang Bổng", "cai_bang_chuong":"Cái Bang Chưởng", "thien_son_phien":"Thiên Sơn Phiến", "thien_son_dao":"Thiên Sơn Đao", "vo_dang_quyen":"Võ Đang Quyền", "vo_dang_kiem":"Võ Đang Kiếm", "thieu_lam_quyen":"Thiếu Lâm Quyền", "thieu_lam_dao":"Thiếu Lâm Đao"}
runs = []
for file in (ROOT / "artifacts/campaign-readiness").glob("*tail*.json"):
    data = json.loads(file.read_text(encoding="utf-8"))
    if data.get("version") != 2 or data.get("sourceHash") != SOURCE_HASH:
        continue
    data["file"] = str(file.relative_to(ROOT)).replace("\\", "/")
    runs.append(data)
assert len(runs) == 49, ("Incomplete or mixed-source matrix", len(runs))
assert len({json.dumps(r["coreHashes"], sort_keys=True) for r in runs}) == 1
for name, expected in runs[0]["coreHashes"].items():
    assert hashlib.sha256((ROOT/f"packages/game-core/src/{name}.ts").read_bytes()).hexdigest() == expected
forecasts = [r for r in runs if r["mode"] == "forecast"]
natural = [r for r in runs if r["mode"] == "natural"]
assert len(forecasts) == 43 and len(natural) == 6
for run in forecasts:
    assert run["outcome"] == "conditional_economy_complete"
    assert [c["boss"] for c in run["checkpoints"]] == BOSSES
    for i, checkpoint in enumerate(run["checkpoints"]):
        assert len(checkpoint["players"]) == run["players"]
        for player in checkpoint["players"]:
            assert player["xp"] == player["farmXp"] + player["invasionXp"] + player["bossXp"]
            assert player["goldEarned"] == player["farmGold"] + player["invasionGold"] + player["bossGold"]
            assert player["goldEarned"] == player["goldHeld"] + player["gearSpent"] + player["potionSpent"]
            assert player["bossGold"] == BOSS_GOLD[i]
            assert player["goldHeld"] >= 0
            assert all(0 <= n <= 5 for n in player["levels"].values())
            assert len(player["crafted"]) <= [0,0,1,1,2,2,3,3,4][i]
            allowed_slots = [set(),set(),{"boots"},{"boots"},{"boots","armor"},{"boots","armor"},{"boots","armor","hat"},{"boots","armor","hat"},{"boots","armor","hat","weapon"}][i]
            assert set(player["crafted"]).issubset(allowed_slots)


def group(variant="candidate", players=1, tail=30, basic=None):
    return [r for r in forecasts if r["variant"] == variant and r["players"] == players and r["defenseTailSeconds"] == tail and (basic is None or players != 1 or r["roster"] == [basic])]


def observations(selected, boss):
    return [p for r in selected for c in r["checkpoints"] if c["boss"] == boss for p in c["players"]]


def stats(selected, boss):
    ps = observations(selected, boss)
    return {"n":len(ps), "level":[min(p["level"] for p in ps), max(p["level"] for p in ps)], "gold":[min(p["goldEarned"] for p in ps), max(p["goldEarned"] for p in ps)], "meanLevel":round(statistics.mean(p["level"] for p in ps),3), "meanGold":round(statistics.mean(p["goldEarned"] for p in ps),3), "belowLevel":sum(p["levelShortfall"] > 0 for p in ps), "belowGold":sum(p["goldShortfall"] > 0 for p in ps), "crafted":[min(len(p["crafted"]) for p in ps),max(len(p["crafted"]) for p in ps)], "farmXp":[min(p["farmXp"] for p in ps),max(p["farmXp"] for p in ps)]}


def fmt(value):
    return f"{value:,}".replace(",", ".")


def span(pair):
    return fmt(pair[0]) if pair[0] == pair[1] else f"{fmt(pair[0])}–{fmt(pair[1])}"

candidate = {str(n):{boss:stats(group(players=n),boss) for boss in BOSSES} for n in [1,6]}
comparison = {v:{str(n):{boss:stats(group(v,n,basic="cai_bang_chuong"),boss) for boss in WAVE_BOSSES} for n in [1,6]} for v in ["legacy","compressed","candidate"]}
branches = {basic:{boss:stats(group(players=1,basic=basic),boss) for boss in WAVE_BOSSES} for basic in BRANCH_NAMES}
sensitivity = {str(t):{str(n):{boss:stats([r for r in group(players=n,tail=t,basic="cai_bang_chuong") if r["seed"]==42],boss) for boss in WAVE_BOSSES} for n in [1,6]} for t in [0,30,60]}
summary = {"sourceHash":SOURCE_HASH, "coreHashes":runs[0]["coreHashes"], "runs":len(runs), "forecastRuns":len(forecasts), "naturalRuns":len(natural), "seeds":[42,1337,9001], "audits":{"completeNineCheckpointSequences":43,"accountingIssues":0,"negativeGold":0,"sameSourceAndCoreHashes":True}, "candidate":candidate, "comparison":comparison, "soloBranches":branches, "clearTailSensitivitySeed42":sensitivity, "natural":[{k:r[k] for k in ["players","seed","outcome","seconds","statueHp","invasionKills","farmKills","finalPlayers"]} for r in natural], "rawReports":[r["file"] for r in sorted(runs,key=lambda r:r["file"])], "limits":["All nine-boss forecasts assume every invasion creep is cleared with every player eligible and each boss is successfully cleared.","Boss combat, HP-potion consumption and failed-attempt cost are not simulated in forecasts; heroes are invulnerable while real private-dungeon combat is simulated.","The six natural bot attempts all lose their statue during wave one; they are not completed campaigns or human win-rate evidence.","Fixed-branch bot policy, walking return and round-robin skills are not optimal human play; solo/party comparisons also depend on branch composition.","Comparison keeps current combat tuning; legacy is a pacing/density reference, not a full checkout replay of historical M3D."]}
(OUTPUT/"summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
csvfile = ROOT/"artifacts/campaign-readiness/checkpoints.csv"
with csvfile.open("w",newline="",encoding="utf-8-sig") as fp:
    writer = csv.writer(fp)
    writer.writerow(["variant","players","seed","clearTailSeconds","basic","boss","invasionSeconds","wallSeconds","level","goalLevelWaveBossOnly","xp","goldEarned","goldHeld","gearSpent","potionSpent","weapon","armor","hat","boots","crafted","farmXp","invasionXp","bossXp"])
    for run in sorted(forecasts,key=lambda r:r["file"]):
        for cp in run["checkpoints"]:
            for p in cp["players"]:
                writer.writerow([run["variant"],run["players"],run["seed"],run["defenseTailSeconds"],p["basic"],cp["boss"],cp["invasionSeconds"],cp["wallSeconds"],p["level"],cp["goal"]["level"] if cp["boss"] in WAVE_BOSSES else "",p["xp"],p["goldEarned"],p["goldHeld"],p["gearSpent"],p["potionSpent"],*[p["levels"][s] for s in ["weapon","armor","hat","boots"]],"/".join(p["crafted"]),p["farmXp"],p["invasionXp"],p["bossXp"]])

lines = ["# Kiểm tra readiness chiến dịch solo và sáu người — 2026-11-27", "", "**Kết luận trong mô hình:** phương án mới cải thiện rõ so với lịch bắt đầu wave mỗi 120s, nhưng còn hụt EXP tại mốc 12/18/24. Trang bị đạt các mốc 1/2/3/4 món ghép theo chặng trong forecast; đây không phải bằng chứng clear boss thật.", "", "## Phạm vi và giả định", "", "Bắt đầu trên `wip/m4d/diff-level`; checkout dùng chung được chuyển sang `milestone/m4d` trong phiên. Hai ref cùng commit `9a64791a`, và hash core của toàn bộ report khớp mã hiện tại. Không đổi runtime hoặc tuning được duyệt trong lượt phân tích này. Đã chạy 49 scenario: 39 forecast chính, 4 forecast sensitivity và 6 lượt bot tự nhiên; seed 42/1337/9001. Solo candidate bao phủ tám nhánh của Cái Bang, Thiên Sơn, Võ Đang, Thiếu Lâm (24 lượt). Đội sáu người gồm Cái Bang Chưởng/Bổng, Thiên Sơn Phiến/Đao, Võ Đang Kiếm, Thiếu Lâm Quyền; mỗi nhân vật farm instance riêng. Không đồng nhất composition giữa solo mọi nhánh và party; so sánh chính sách dùng solo Cái Bang Chưởng cố định.", "", "Forecast chạy combat farm, collision, di chuyển về cửa, học kỹ năng, giá đồ, giao dịch, phần dư và phạt EXP bằng core thật. **Giả định** thủ đủ mọi creep và mọi người đều đủ điều kiện nhận pool; wave boss thành công sau 90s + 10s chuẩn bị, dungeon boss thành công sau 90s có pause invasion clock. Các clear và material/Long Châu được quyết toán bằng API core, không được coi là kết quả combat. Hero bất tử trong forecast; không tính mana/máu/bình tiêu trong boss hay chi phí thất bại. Vì vậy income/eligibility là thuận lợi, còn tốc độ farm chỉ phản ánh policy bot, không phải cận trên toán học hoặc người chơi tối ưu.", "", "Budget mặc định: 60s stream + 30s dọn; bắt đầu đi về trước wave 30s; shop dùng tiền kiếm được và có 5s dự trù sau khi về. Giá, trang bị và potion tồn kho đầu trận giữ nguyên; ưu tiên nâng bộ cơ bản rồi ghép giày/giáp/mũ/vũ khí khi đã có material. Mỗi wave dungeon giữ tiến trình và HP scaling thật. Thời gian boss là giả định, chưa được hiệu chuẩn bằng bot thắng boss.", "", "## Solo", "", "Dải dưới đây bao gồm tám nhánh × ba seed. Vàng là **tổng vàng đã kiếm, gồm phần đã chi**, không phải số dư. Mốc mục tiêu chỉ áp dụng cho năm wave boss trong tài liệu campaign; không gán một mốc level mới cho dungeon boss.", "", "| Trước boss | Cấp solo | Vàng solo | Món ghép | Mốc cấp wave boss |", "| --- | ---: | ---: | ---: | ---: |"]
for i,boss in enumerate(BOSSES):
    a=candidate["1"][boss]
    goal={BOSSES[0]:"6",BOSSES[2]:"12",BOSSES[4]:"18",BOSSES[6]:"24",BOSSES[8]:"26–28"}.get(boss,"—")
    lines.append(f"| {NAMES[i]} | {span(a['level'])} | {span(a['gold'])} | {span(a['crafted'])} | {goal} |")
lines += ["", "Cả 24/24 lượt solo thiếu cấp 18 trước Nam Đế và thiếu cấp 24 trước Bắc Cái. Trước Tây Độc: 10/24 lượt chưa đủ cấp 12. Trước Vương Trùng Dương: 16/24 lượt chưa đủ cấp 26. Đây là quan sát của policy bot, không phải tỷ lệ thất bại của người thật.", "", "### Theo nhánh solo", "", "| Nhánh | Đông Tà | Tây Độc | Nam Đế | Bắc Cái | Vương Trùng Dương |", "| --- | ---: | ---: | ---: | ---: | ---: |"]
for basic,name in BRANCH_NAMES.items():
    lines.append("| "+name+" | "+" | ".join(span(branches[basic][b]["level"]) for b in WAVE_BOSSES)+" |")
lines += ["", "## Sáu người", "", "Dải là min–max theo từng người trong ba seed (18 quan sát nhân vật mỗi boss), không lấy trung bình party để che người thiếu cấp.", "", "| Trước boss | Cấp/người | Vàng/người | Món ghép/người |", "| --- | ---: | ---: | ---: |"]
for i,boss in enumerate(BOSSES):
    a=candidate["6"][boss]
    lines.append(f"| {NAMES[i]} | {span(a['level'])} | {span(a['gold'])} | {span(a['crafted'])} |")
lines += ["", "Trước Tây Độc có 3/18 quan sát thiếu cấp 12; Nam Đế 12/18 thiếu cấp 18; Bắc Cái 15/18 thiếu cấp 24; Vương Trùng Dương 3/18 thiếu cấp 26. Các mốc 12/18/24 mở bậc ultimate, nên hụt EXP có tác động tới kỹ năng dù đã mua được đồ.", "", "## So với hai lịch trước", "", "Giữ cùng bot solo Cái Bang Chưởng và cùng party sáu người; ba seed. `legacy`: interval 180s, một hàng, floor 900s, thưởng farm cũ; `compressed`: interval 120s từ đầu stream, hai hàng, floor 600s, thưởng cũ; `candidate`: 120s sau stream, hai hàng, floor 900s, farm ×1,25. Tất cả giữ combat tuning hiện tại và cùng budget dọn 30s: đây là so sánh pacing, không replay nguyên phiên bản M3D lịch sử.", "", "| Trước boss | Solo legacy | Solo compressed | Solo candidate | Party compressed | Party candidate |", "| --- | ---: | ---: | ---: | ---: | ---: |"]
for boss in WAVE_BOSSES:
    i=BOSSES.index(boss)
    cells=[span(comparison[v][str(n)][boss]["level"]) for v,n in [("legacy",1),("compressed",1),("candidate",1),("compressed",6),("candidate",6)]]
    lines.append("| "+NAMES[i]+" | "+" | ".join(cells)+" |")
lines += ["", "Lịch mới khôi phục phần lớn thời gian farm bị mất, nhưng mục tiêu cấp cũ cũng chưa được mô hình legacy đáp ứng đều. Không quy toàn bộ thiếu EXP cho thay đổi 3→2 phút. Bù thêm vàng đại trà chưa có cơ sở từ kết quả này; ưu tiên thử EXP theo chặng để không lỡ mốc kỹ năng và kiểm tra lại nhánh farm chậm.", "", "## Độ nhạy thời gian dọn wave", "", "Chỉ seed 42, solo Cái Bang Chưởng và cùng party. 0s nghĩa là giả định dọn xong ngay khi kết thúc stream; 60s là cần thêm một phút. Không thay số quái, chỉ thay phần thời gian bị dành cho thủ trong forecast.", "", "| Dọn thêm | Solo: Tây/Nam/Bắc/VTD | Sáu người: Tây/Nam/Bắc/VTD |", "| --- | --- | --- |"]
for tail in [0,30,60]:
    cells=[" / ".join(span(sensitivity[str(tail)][str(n)][b]["level"]) for b in WAVE_BOSSES[1:]) for n in [1,6]]
    lines.append(f"| {tail}s | {cells[0]} | {cells[1]} |")
lines += ["", "Ngay giả định dọn xong cuối stream, solo Cái Bang Chưởng vẫn thiếu cấp tại Tây/Nam/Bắc. Con số phụ thuộc policy farm; không chứng minh mọi người chơi sẽ thiếu cùng mức.", "", "## Lượt bot tự nhiên", "", "Không bất tử, không cấp trước level/đồ/tiền, quái xâm lăng thật và tượng 2.000 HP. Sáu lượt đều mất tượng ngay wave 1, trong khoảng 142,77–147,63 giây invasion clock. Bot dùng nearest-target, round-robin kỹ năng, không biết né/điều phối bốn cổng như người chơi. Không có checkpoint boss tự nhiên, không có lượt thắng trọn chiến dịch. Kết quả này chỉ chứng minh bot hiện tại chưa đủ cho full-campaign victory acceptance; không suy ra tỷ lệ thắng hoặc kết luận cần nerf dựa trên riêng bot.", "", "## Kiểm tra và tái lập", "", "- `pnpm exec tsc -p tsconfig.tools.json --noEmit`: PASS sau khi chốt runner.", "- `pnpm qa:preflight --mode quick`: PASS; `pnpm exec tsc -b packages/game-core packages/game-data`: PASS.", "- `pnpm exec vitest run tests/campaign.test.ts tests/dungeons.test.ts tests/wave-pacing.test.ts tests/invasions.test.ts tests/economy.test.ts`: **101/101 PASS**.", "- Audit 43 chuỗi đủ chín checkpoint, từng nhân vật: XP = farm + invasion + boss; tổng vàng = còn giữ + chi đồ + chi bình = tổng các nguồn thu; reward boss đúng một lần; không âm vàng; material chưa mở không được craft. **0 sai lệch**. Tất cả 49 report cùng source hash và sáu core source hash; đối chiếu hash hiện tại PASS.", "- Pilot soạn runner không dùng trong kết luận: một conditional siege pilot bị dừng vì tích quái/gate quan sát chưa đúng; các pilot version 1 được giữ trong artifacts nhưng loại khỏi ma trận version 2. Không ghi video hoặc ảnh động.", "", "Ví dụ chạy lại:", "", "```powershell", "pnpm --filter @volam/game-server exec tsx ../../tools/campaign-readiness.ts --mode forecast --variant candidate --players 1 --seed 42 --max-seconds 6000", "pnpm --filter @volam/game-server exec tsx ../../tools/campaign-readiness.ts --mode forecast --variant candidate --players 6 --seed 42 --max-seconds 6000", "pnpm --filter @volam/game-server exec tsx ../../tools/campaign-readiness.ts --mode natural --variant candidate --players 6 --seed 42 --max-seconds 1600 --end-wave 5", "python -X utf8 tools/summarize-campaign-readiness.py", "```", "", "Chạy các tổ hợp còn lại theo `rawReports` và metadata trong [summary](evidence/sessions/campaign-readiness-2026-11-27/summary.json). [Runner](../tools/campaign-readiness.ts), [auditor/exporter](../tools/summarize-campaign-readiness.py). JSON đầy đủ và `checkpoints.csv` nằm trong `artifacts/campaign-readiness/` (ignored). Mốc chuẩn: [campaign balance](CAMPAIGN_BALANCE_2026_11_06.md); cấu hình mới: [wave pacing](M4D_WAVE_PACING_2026_11_27.md)."]
(ROOT/"docs/CAMPAIGN_READINESS_2026_11_27.md").write_text("\n".join(lines)+"\n",encoding="utf-8")
print(json.dumps({"runs":len(runs),"forecasts":len(forecasts),"natural":len(natural),"audits":"PASS","report":"docs/CAMPAIGN_READINESS_2026_11_27.md","csv":str(csvfile.relative_to(ROOT))},ensure_ascii=False))
