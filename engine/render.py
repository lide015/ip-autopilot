"""影片合成（FFmpeg）：直式 9:16、重拍縮放、閃光、調色、波形、字幕、音訊淡入淡出。"""
from __future__ import annotations

from pathlib import Path

from .audio import run

W, H, FPS = 1080, 1920, 30


def _pulses(times: list[float], start: float, end: float, amp: float, decay: float, span: float) -> str:
    """產生「在每個拍點瞬間跳起、再慢慢回落」的 FFmpeg 運算式（t 為片段內的時間）。"""
    terms = []
    for b in times:
        if start - span <= b < end:
            k = round(b - start, 3)
            terms.append(f"{amp}*exp(-(T-{k})*{decay})*between(T-{k},0,{span})")
    return "+".join(terms) if terms else "0"


def render(
    *,
    video: str,
    audio: Path,
    out: Path,
    start: float,
    dur: float,
    portrait: bool,
    preset: dict,
    beats: list[float],
    downbeats: list[float],
    ass_file: Path,
    mode: str,
) -> Path:
    """mode：hook（副歌版：重拍縮放）、mood（歌詞意境版：慢推近）、teaser（預告卡點版：每拍縮放＋波形）。"""
    hits = beats if (mode == "teaser" or preset["every_beat"]) else downbeats
    if mode == "mood":
        zexpr = f"1+0.08*it/{dur:.2f}"
    else:
        zexpr = "1+" + _pulses(hits, start, start + dur, preset["zoom"], 7, 0.6).replace("T", "it")
    flash = preset["flash"] if mode != "mood" else 0.0
    fexpr = _pulses(downbeats, start, start + dur, flash, 14, 0.3).replace("T", "t") if flash else "0"

    if portrait:
        frame = f"[0:v]setpts=PTS-STARTPTS,fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1[base]"
    else:  # 橫拍：模糊放大當背景，原畫面置中，不裁掉人
        frame = (
            f"[0:v]setpts=PTS-STARTPTS,fps={FPS},split[a][b];"
            f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=24:2,eq=brightness=-0.14[bg];"
            f"[b]scale={W}:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[base]"
        )
    parts = [
        frame,
        f"[base]zoompan=z='{zexpr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS}[z]",
        f"[z]{preset['grade']},eq=brightness='{fexpr}':eval=frame[g]",
    ]
    if mode == "teaser":
        parts.append("[1:a]asplit[aw][ao]")
        parts.append(f"[aw]showwaves=s={W}x160:mode=cline:rate={FPS}:colors={preset['wave']},format=rgba,colorchannelmixer=aa=0.85[wv]")
        parts.append("[g][wv]overlay=0:1430:shortest=1[gw]")
        last, aud = "gw", "ao"
    else:
        last, aud = "g", "1:a"
    parts.append(f"[{last}]ass={ass_file.as_posix()}[v]")
    parts.append(f"[{aud}]afade=t=in:d=0.25,afade=t=out:st={max(0.0, dur - 0.8):.2f}:d=0.8[a]")

    run([
        "ffmpeg", "-loglevel", "error", "-y",
        "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", video,
        "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", str(audio),
        "-filter_complex", ";".join(parts),
        "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-t", f"{dur:.3f}",
        str(out),
    ])
    return out


def cover(video: Path, out: Path, at: float = 1.4) -> Path:
    run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{at:.2f}", "-i", str(video), "-frames:v", "1", "-q:v", "3", str(out)])
    return out
