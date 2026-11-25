"""剪輯引擎測試：用合成歌曲跑完整流程，檢查分析準確度與成品規格。

執行：python -m engine.tests.test_engine（需要 ffmpeg 與 engine/requirements.txt 的套件）
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from engine import analysis, job, lyrics, promo
from engine.tests import fixture

failed = 0


def ok(cond: bool, name: str) -> None:
    global failed
    print(f"{'✓' if cond else '✗'} {name}", flush=True)
    if not cond:
        failed += 1


def spec(path: Path) -> tuple[int, int, float]:
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", str(path)],
                         capture_output=True, text=True, check=True).stdout
    d = json.loads(out)
    return d["streams"][0]["width"], d["streams"][0]["height"], float(d["format"]["duration"])


def main() -> int:
    tmp = Path(tempfile.mkdtemp(prefix="engine-test-"))
    video = fixture.make(tmp)
    wav = tmp / "fixture.wav"

    # 分析
    a = analysis.analyze(str(wav), length=24)
    ok(abs(a.bpm - fixture.BPM) <= 3, f"偵測速度約 {fixture.BPM} BPM（實際 {a.bpm:.1f}）")
    beat = 60 / fixture.BPM
    ok(all(abs((d / beat) - round(d / beat)) < 0.15 and round(d / beat) % 4 == 0 for d in a.downbeats[:6]), "重拍落在每小節第一拍")
    ok(fixture.CHORUS[0] - 3 <= a.chorus[0] <= fixture.CHORUS[0] + 1.5, f"找到副歌開頭（{a.chorus[0]:.1f} 秒，實際 {fixture.CHORUS[0]} 秒）")
    ph = analysis.vocal_phrases(str(wav), fixture.CHORUS[0], fixture.CHORUS[1])
    ok(9 <= len(ph) <= 11 and all(1.4 <= b - a_ <= 2.2 for a_, b in ph[:-1]), f"人聲樂句切得準（{len(ph)} 句）")

    # 歌詞對位
    al = lyrics.align([f"第{i}句" for i in range(10)], ph, fixture.CHORUS[0], fixture.CHORUS[1])
    ok(len(al) == 10 and all(al[i][1] <= al[i + 1][0] for i in range(9)), "10 行歌詞對到 10 個樂句、彼此不重疊")
    ok(len(lyrics.align(["一", "二", "三"], ph, *fixture.CHORUS)) == 3, "歌詞比樂句少時平均分配")

    # 需求表單解析
    form = job.parse("### 影片連結\n\nhttps://example.com/a.mp4\n\n### 歌名或作品名稱\n\n夜裡的歌\n\n### 副歌從哪裡開始（可不填）\n\n_No response_\n")
    ok(form.get("video", "").startswith("https://") and form.get("title") == "夜裡的歌" and form.get("start") == "", "看得懂 GitHub 需求表單")
    ok(job.to_seconds("1:20") == 80 and job.to_seconds("45") == 45 and job.to_seconds("") is None, "副歌開始時間支援 1:20 與 80 兩種寫法")

    # 完整大禮包（縮短長度讓測試快一點）
    out = tmp / "out"
    r = promo.promo(str(video), out, title="測試之歌", lyrics_text="第一句\n第二句\n第三句\n第四句", info="12/20 範例展演空間",
                    preset="live", length=8, teaser=6, log=lambda *_: None)
    for mode, d in (("hook", 8), ("mood", 8), ("teaser", 6)):
        w, h, dur = spec(out / f"live-{mode}.mp4")
        ok((w, h) == (1080, 1920) and abs(dur - d) < 0.3, f"{mode} 是 1080×1920 直式、長度 {d} 秒（實際 {dur:.1f}）")
    ok(-16.5 <= r["loudness"]["after"] <= -12.5, f"音質處理後響度接近 -14 LUFS（{r['loudness']['after']}）")
    ok(all((out / f).exists() for f in ("cover.jpg", "copy.md", "report.md", "analysis.json", "lyrics.srt")), "封面、文案、報告、分析、字幕檔都有產出")
    ok("【待填" in (out / "copy.md").read_text(encoding="utf-8") or "##" in (out / "copy.md").read_text(encoding="utf-8"), "沒有金鑰時附上完整提示詞")

    print(f"\n{failed} 項失敗" if failed else "\n剪輯引擎全部通過")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
