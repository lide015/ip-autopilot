"""產生測試用的合成歌曲影片（橫式 1280x720、100 BPM）。

段落：前奏 0–16 秒（安靜）→ 主歌 16–40 秒（中等＋人聲）→ 副歌 40–64 秒（大聲＋人聲＋鼓）→ 尾奏 64–80 秒。
人聲是有顫音的正弦波，每 2.4 秒唱 1.8 秒、停 0.6 秒，用來測試樂句偵測與歌詞對位。
"""
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

SR = 44100
BPM = 100
DUR = 80
CHORUS = (40.0, 64.0)
VERSE = (16.0, 40.0)


def song() -> np.ndarray:
    t = np.arange(int(SR * DUR)) / SR
    y = np.zeros_like(t)
    beat = 60 / BPM
    # 和弦鋪底（全曲）
    for f in (220.0, 277.18, 329.63):
        y += 0.03 * np.sin(2 * np.pi * f * t)
    # 鼓：大鼓每拍、小鼓在 2、4 拍；副歌最大聲
    for i in range(int(DUR / beat)):
        s = i * beat
        gain = 0.25 if VERSE[0] <= s < VERSE[1] else 0.9 if CHORUS[0] <= s < CHORUS[1] else 0.08
        n = int(0.12 * SR)
        idx = int(s * SR)
        if idx + n > len(y):
            break
        env = np.exp(-np.linspace(0, 12, n))
        y[idx:idx + n] += gain * env * np.sin(2 * np.pi * 60 * np.arange(n) / SR)
        if i % 4 == 0:  # 重拍加強
            y[idx:idx + n] += gain * 0.6 * env * np.sin(2 * np.pi * 45 * np.arange(n) / SR)
        if i % 2 == 1:
            y[idx:idx + n] += gain * 0.35 * env * np.random.default_rng(i).normal(0, 1, n)
    # 人聲：主歌與副歌
    for a, b, g in ((VERSE[0], VERSE[1], 0.12), (CHORUS[0], CHORUS[1], 0.22)):
        s = a
        k = 0
        while s + 1.8 <= b:
            n0, n1 = int(s * SR), int((s + 1.8) * SR)
            tt = t[n0:n1] - s
            f0 = (392.0, 440.0, 349.23, 329.63)[k % 4] * (1 + 0.01 * np.sin(2 * np.pi * 5.5 * tt))
            env = np.minimum(1, tt / 0.05) * np.minimum(1, (1.8 - tt) / 0.1)
            y[n0:n1] += g * env * (np.sin(2 * np.pi * f0 * tt) + 0.4 * np.sin(4 * np.pi * f0 * tt))
            s += 2.4
            k += 1
    # 手機收音的底噪
    y += np.random.default_rng(0).normal(0, 0.004, len(y))
    return (y / np.max(np.abs(y)) * 0.8).astype(np.float32)


def make(out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    wav = out_dir / "fixture.wav"
    mp4 = out_dir / "fixture.mp4"
    sf.write(wav, song(), SR)
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i", f"testsrc2=size=1280x720:rate=30:duration={DUR}",
         "-i", str(wav), "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(mp4)],
        check=True,
    )
    return mp4


if __name__ == "__main__":
    print(make(Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/engine-fixture")))
