"""Validate the approved V04 inputs without modifying historical exports."""
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
REVIEW = ROOT / "assets/reviews/bosses/dong_ta_v02"


def read(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    lock = read(ROOT / "assets/approved_dong_ta.lock.json")
    approval_path = ROOT / lock["approvalRecord"]
    approval = read(approval_path)
    assert lock["status"] == approval["status"]
    assert approval_path.relative_to(ROOT).as_posix() in lock["files"]
    for relative, expected in lock["files"].items():
        path = (ROOT / relative).resolve()
        assert path.is_relative_to(ROOT), relative
        assert path.is_file(), f"Missing approved input: {relative}"
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        assert actual == expected, f"Approved input changed: {relative}"

    data = read(REVIEW / "data.json")
    clips = 0
    for key, selected in approval["selectedBundles"].items():
        bundle = data["bundles"][key]
        assert bundle["image"] == selected["image"]
        assert bundle["origin"] == selected["origin"]
        assert selected["image"] in lock["files"]
        by_name = {clip["name"]: clip for clip in bundle["clips"]}
        assert selected["clips"] and len(set(selected["clips"])) == len(selected["clips"])
        for name in selected["clips"]:
            clip = by_name[name]
            assert clip["frames"] and clip["fps"] > 0
            assert all(frame in bundle["frames"] for frame in clip["frames"])
            clips += 1
    assert not set(approval["excludedLegacyBundles"] + approval["referenceOnlyBundles"]) & set(approval["selectedBundles"])
    assert approval["gameRuntimeIntegrated"] is False
    assert approval["finalGameRuntimeArtApproved"] is False
    assert approval["finalCombatBalanceApproved"] is False
    policy = approval["confirmedPolicies"]
    for key in ["statueHiddenDuringFight", "statueInvulnerableDuringFightAndRetries",
                "invasionClockContinues", "recallAllRoomPlayersIncludingDungeonAndPvp",
                "reviveAllDeadOnRecall", "clearOnDongTaDeath", "wipeResetsBossAndAttemptState",
                "quitAllowed", "maiClawsFrontOnly", "maiFocusSinglePlayerUntilDeadOrInvalid",
                "dualSummonOncePerAttempt"]:
        assert policy[key] is True, key
    for key in ["statueRepair", "requireSummonKillsForClear", "newArena", "bossTargetsStatue",
                "lacAnhActivePolygonDash", "maiTargetLockAnimation"]:
        assert policy[key] is False, key
    assert policy["invasionIntervalSeconds"] == 180
    assert policy["retryLimit"] is None
    assert policy["taKiemForwardArcDegrees"] == 180
    assert policy["danChiDirectionCount"] == [8, 14]
    assert policy["lacAnhActivePatterns"] == ["plus", "x"]
    assert policy["lacAnhActiveSlashCount"] == 4
    assert policy["ngocTieuRandomFlowerClusters"] == 40
    assert policy["dualSummonBelowHpFraction"] == 0.4
    assert policy["hoangAbilities"] == ["thanh_am_ho_tro", "linh_xa_bo"]
    assert (ROOT / approval["integrationPrompt"]).is_file()
    print(f"PASS: {len(lock['files'])} approved file hashes, {clips} selected clips, confirmed encounter policies; runtime/balance remain pending.")


if __name__ == "__main__":
    main()
