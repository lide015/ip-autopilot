"""音訊：抽出音軌、母帶處理（降噪、等化、壓縮、響度標準化）、選用的人聲分離。"""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path


def run(cmd: list[str]) -> str:
    """執行指令，失敗時把最後幾行錯誤訊息帶出來。"""
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        tail = "\n".join((p.stderr or p.stdout).strip().splitlines()[-8:])
        raise RuntimeError(f"指令失敗：{' '.join(cmd[:3])} …\n{tail}")
    return p.stdout


def probe(path: str) -> dict:
    out = run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:stream_tags=rotate:stream_side_data=rotation:format=duration", "-of", "json", path])
    data = json.loads(out)
    v = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), None)
    a = next((s for s in data.get("streams", []) if s.get("codec_type") == "audio"), None)
    if not v:
        raise RuntimeError("這個檔案沒有影像，請確認是影片檔")
    if not a:
        raise RuntimeError("這支影片沒有聲音，音樂剪輯需要有聲音的影片")
    w, h = int(v["width"]), int(v["height"])
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(sd["rotation"])
    rot = rot or int((v.get("tags") or {}).get("rotate", 0))
    if abs(rot) % 180 == 90:  # 手機直拍常常是「橫的畫面＋旋轉標記」
        w, h = h, w
    return {"width": w, "height": h, "duration": float(data["format"]["duration"])}


def extract_wav(video: str, out: Path) -> Path:
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", video, "-vn", "-ac", "2", "-ar", "44100", str(out)])
    return out


# 母帶處理鏈：去掉低頻轟聲 → 降底噪 → 收掉混濁 → 提亮人聲 → 壓縮讓音量穩 → 響度標準化（社群平台常用 -14 LUFS）
MASTER_CHAIN = ",".join([
    "highpass=f=70",
    "afftdn=nf=-28:tn=1",
    "equalizer=f=250:t=q:w=1.2:g=-2",
    "equalizer=f=3200:t=q:w=1.0:g=2",
    "equalizer=f=11000:t=h:w=0.7:g=1.5",
    "acompressor=threshold=0.125:ratio=3:attack=12:release=180:makeup=1.5",
    "alimiter=limit=0.89",
])
TARGET = "I=-14:TP=-1.0:LRA=11"


def master(wav: Path, out: Path) -> Path:
    """兩段式響度標準化：先量、再依量測結果線性調整，成品才會準確落在 -14 LUFS。"""
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(wav), "-af", f"{MASTER_CHAIN},loudnorm={TARGET}:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    second = f"loudnorm={TARGET}"
    try:
        m = json.loads(p.stderr[p.stderr.rindex("{"):p.stderr.rindex("}") + 1])
        second += (f":measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
                   f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    except (ValueError, KeyError):
        pass  # 量測失敗就用單段式
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav), "-af", f"{MASTER_CHAIN},{second}", "-ar", "44100", str(out)])
    return out


def loudness(wav: Path) -> float:
    """量測整體響度（LUFS），報告用。"""
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(wav), "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True)
    for line in reversed(p.stderr.splitlines()):
        line = line.strip()
        if line.startswith("I:") and "LUFS" in line:
            return float(line.split()[1])
    return float("nan")


def separate_vocals(wav: Path, work: Path) -> Path | None:
    """用 Demucs 分出人聲軌（選用）。沒有安裝或失敗時回傳 None，引擎會改用估計法。"""
    if shutil.which("demucs") is None:
        return None
    try:
        run(["demucs", "--two-stems=vocals", "-n", "htdemucs", "-o", str(work / "demucs"), str(wav)])
    except RuntimeError:
        return None
    hits = list((work / "demucs").rglob("vocals.wav"))
    return hits[0] if hits else None
