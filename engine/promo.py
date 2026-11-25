"""「我要宣傳新歌／演出」一鍵大禮包：一支影片 → 3 支短影音＋封面＋字幕＋文案＋報告。"""
from __future__ import annotations

import json
import shutil
import time
from pathlib import Path

from . import analysis, audio, copywriter, lyrics, presets, render

OUTPUTS = [
    ("hook", "副歌版", "抓出最高潮的副歌，重拍時畫面跟著跳"),
    ("mood", "歌詞意境版", "慢慢推近的畫面＋MV 歌詞，適合配限動"),
    ("teaser", "預告卡點版", "短版、每拍跳動＋音波，演出資訊整支都在"),
]


def promo(
    video: str,
    out: Path,
    *,
    title: str = "",
    lyrics_text: str = "",
    info: str = "",
    preset: str = "night",
    brand: str = "",
    length: float = 30.0,
    teaser: float = 15.0,
    use_demucs: bool = False,
    start: float | None = None,
    log=print,
) -> dict:
    t0 = time.time()
    out.mkdir(parents=True, exist_ok=True)
    work = out / "_work"
    work.mkdir(exist_ok=True)
    key, p = presets.get(preset)
    log(f"① 讀取影片（風格：{p['name']}）")
    meta = audio.probe(video)
    if meta["duration"] < 8:
        raise RuntimeError("影片太短了，至少需要 8 秒")
    portrait = meta["height"] > meta["width"]

    log("② 音質處理：降噪、等化、壓縮、響度標準化")
    raw = audio.extract_wav(video, work / "raw.wav")
    mastered = audio.master(raw, work / "mastered.wav")
    lufs_before, lufs_after = audio.loudness(raw), audio.loudness(mastered)

    log("③ 分析節拍與副歌")
    a = analysis.analyze(str(raw), length=min(length, meta["duration"]))
    if start is not None:  # 使用者指定副歌從哪裡開始：對齊到最近的重拍
        snap = min(a.downbeats, key=lambda d: abs(d - start)) if a.downbeats else start
        if abs(snap - start) > 1.5:
            snap = start
        snap = max(0.0, min(snap, meta["duration"] - 4))
        a.chorus = (snap, min(snap + min(length, meta["duration"]), meta["duration"]))
    h0, h1 = a.chorus
    t_0, t_1 = analysis.best_window(a, a.chorus, teaser)

    vocals = None
    if use_demucs:
        log("　 分離人聲（Demucs）")
        vocals = audio.separate_vocals(raw, work)
        log("　 人聲分離完成" if vocals else "　 沒有可用的 Demucs，改用估計法找人聲")

    lines = lyrics.clean_lines(lyrics_text)
    hook_ly = []
    if lines:
        log(f"④ 對位歌詞（{len(lines)} 行）")
        phrases = analysis.vocal_phrases(str(raw), h0, h1, str(vocals) if vocals else None)
        hook_ly = lyrics.align(lines, phrases, h0, h1)
    teaser_ly = [(round(s - (t_0 - h0), 2), round(e - (t_0 - h0), 2), tx) for s, e, tx in hook_ly if s >= t_0 - h0 - 0.1 and e <= t_1 - h0 + 0.5]
    teaser_ly = [(max(0.0, s), min(t_1 - t_0, e), tx) for s, e, tx in teaser_ly]

    name = f"《{title}》" if title and not title.startswith("《") else title
    hook_d, tease_d = h1 - h0, t_1 - t_0
    jobs = {
        "hook": dict(start=h0, dur=hook_d, ly=hook_ly, title=name, sub="新歌搶先聽" if name else "", cta=info),
        "mood": dict(start=h0, dur=hook_d, ly=hook_ly, title="", sub="", cta=name or info),
        "teaser": dict(start=t_0, dur=tease_d, ly=teaser_ly, title=name, sub="", cta=info or "完整版看主頁連結"),
    }
    files = {}
    for i, (mode, label, _) in enumerate(OUTPUTS, start=5):
        log(f"{'⑤⑥⑦'[i - 5]} 合成「{label}」")
        j = jobs[mode]
        sub = lyrics.ass(work / f"{mode}.ass", p, lyrics=j["ly"], title=j["title"], sub=j["sub"], cta=j["cta"], dur=j["dur"], mode=mode)
        files[mode] = render.render(
            video=video, audio=mastered, out=out / f"{key}-{mode}.mp4", start=j["start"], dur=j["dur"], portrait=portrait,
            preset=p, beats=a.beats, downbeats=a.downbeats, ass_file=sub, mode=mode,
        )
    cover = render.cover(files["hook"], out / "cover.jpg")
    if hook_ly:
        lyrics.srt(out / "lyrics.srt", hook_ly, offset=h0)

    log("⑧ 撰寫宣傳文案")
    full_prompt = copywriter.prompt(brand=brand, title=title, info=info, lyrics="／".join(lines[:8]), preset_name=p["name"])
    items, note = copywriter.write(full_prompt)
    copy_md = ["# 宣傳文案", "", f"> {note}", ""]
    if items:
        for it in items:
            copy_md += [f"## {it['label']}", "", it["text"], ""]
    else:
        copy_md += ["把下面整段複製，貼到 ChatGPT 或 Claude：", "", "```", full_prompt, "```", ""]
    (out / "copy.md").write_text("\n".join(copy_md), encoding="utf-8")

    result = {
        "preset": key,
        "preset_name": p["name"],
        "source": {"width": meta["width"], "height": meta["height"], "duration": round(meta["duration"], 2), "portrait": portrait},
        "analysis": a.to_json(),
        "teaser": [round(t_0, 2), round(t_1, 2)],
        "loudness": {"before": round(lufs_before, 1), "after": round(lufs_after, 1)},
        "lyrics_lines": len(lines),
        "lyrics_aligned": hook_ly,
        "files": [f.name for f in [*files.values(), cover]] + (["lyrics.srt"] if hook_ly else []) + ["copy.md"],
        "seconds": round(time.time() - t0, 1),
    }
    (out / "analysis.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    (out / "report.md").write_text(report(result), encoding="utf-8")
    shutil.rmtree(work, ignore_errors=True)
    log(f"完成，用了 {result['seconds']} 秒")
    return result


def _mmss(t: float) -> str:
    return f"{int(t // 60)}:{int(t % 60):02d}"


def report(r: dict) -> str:
    a = r["analysis"]
    c0, c1 = a["chorus"]
    rows = "\n".join(f"| {label} | `{r['preset']}-{mode}.mp4` | {desc} |" for mode, label, desc in OUTPUTS)
    lufs = r["loudness"]
    ly = f"已對位 {len(r['lyrics_aligned'])} 行（時間可在 lyrics.srt 微調）" if r["lyrics_aligned"] else "沒有提供副歌歌詞，影片不含歌詞字幕"
    return f"""# 剪輯完成：{r['preset_name']}風格

| 成品 | 檔案 | 說明 |
| --- | --- | --- |
{rows}
| 封面 | `cover.jpg` | 副歌版的開場畫面 |
| 文案 | `copy.md` | IG 貼文、限動短句、短影音說明、LINE 提醒 |

## AI 分析結果
- 速度：約 {a['bpm']} BPM，偵測到 {len(a['beats'])} 個拍點、{len(a['downbeats'])} 個重拍
- 副歌：{_mmss(c0)}–{_mmss(c1)}（原影片時間）；15 秒預告取 {_mmss(r['teaser'][0])}–{_mmss(r['teaser'][1])}
- 音質：響度 {lufs['before']} → {lufs['after']} LUFS（社群平台建議約 -14）
- 歌詞：{ly}
- 原影片：{r['source']['width']}×{r['source']['height']}，{'直拍' if r['source']['portrait'] else '橫拍（已轉成直式，背景模糊填滿）'}

## 發布前請看一下
1. 三支影片的歌詞時間對不對（唱歌的對位是估計的）。
2. 副歌選段是不是你最想讓人聽到的那段；不是的話，在需求留言寫「從 1:20 開始」重跑。
3. 文案裡的【待填】要補上。
"""
