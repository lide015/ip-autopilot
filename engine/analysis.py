"""音樂分析：BPM、拍點、重拍、副歌位置、人聲樂句。

只用 Librosa（ISC 授權，可商用）與 NumPy/SciPy，不用 madmom（模型為非商業授權）。
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict

import numpy as np
import librosa
from scipy.ndimage import median_filter, uniform_filter1d

SR = 22050
HOP = 512


@dataclass
class Analysis:
    duration: float
    bpm: float
    beats: list[float]
    downbeats: list[float]
    rms_times: list[float] = field(repr=False)
    rms: list[float] = field(repr=False)
    chorus: tuple[float, float] = (0.0, 0.0)
    chorus_score: float = 0.0
    peak: float = 0.0  # 副歌裡最大聲的時間點（做封面）

    def to_json(self) -> dict:
        d = asdict(self)
        d.pop("rms_times")
        d.pop("rms")
        d["bpm"] = round(self.bpm, 1)
        d["beats"] = [round(b, 3) for b in self.beats]
        d["downbeats"] = [round(b, 3) for b in self.downbeats]
        d["chorus"] = [round(x, 2) for x in self.chorus]
        return d


def load(path: str) -> tuple[np.ndarray, int]:
    y, sr = librosa.load(path, sr=SR, mono=True)
    return y, sr


def _norm(x: np.ndarray) -> np.ndarray:
    lo, hi = float(np.min(x)), float(np.max(x))
    return np.zeros_like(x) if hi - lo < 1e-9 else (x - lo) / (hi - lo)


def beats_and_downbeats(y: np.ndarray, sr: int) -> tuple[float, np.ndarray, np.ndarray]:
    """回傳 (BPM, 拍點秒數, 重拍秒數)。重拍假設 4/4 拍：找低頻最強的那個相位。"""
    onset = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP)
    tempo, beat_frames = librosa.beat.beat_track(onset_envelope=onset, sr=sr, hop_length=HOP)
    bpm = float(np.atleast_1d(tempo)[0])
    beats = librosa.frames_to_time(beat_frames, sr=sr, hop_length=HOP)
    if len(beats) < 8:  # 幾乎沒有節奏（例如清唱）：用固定間隔
        step = 60 / bpm if bpm > 0 else 0.6
        beats = np.arange(0, len(y) / sr, step)
    low = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP, fmax=200, n_mels=32)
    frames = np.clip(librosa.time_to_frames(beats, sr=sr, hop_length=HOP), 0, len(low) - 1)
    strength = low[frames]
    phase = int(np.argmax([strength[p::4].sum() for p in range(4)]))
    return bpm, beats, beats[phase::4]


def find_chorus(y: np.ndarray, sr: int, beats: np.ndarray, downbeats: np.ndarray, length: float) -> tuple[float, float, float]:
    """找最像副歌的一段：音量高、而且和其他段落相似（會重複出現）。回傳 (開始, 結束, 分數)。"""
    dur = len(y) / sr
    length = min(length, dur)
    rms = librosa.feature.rms(y=y, hop_length=HOP)[0]
    rms_t = librosa.times_like(rms, sr=sr, hop_length=HOP)
    # 每拍的和聲特徵 → 自我相似度，代表「重複出現的程度」
    chroma = librosa.feature.chroma_stft(y=y, sr=sr, hop_length=HOP)
    bf = np.clip(librosa.time_to_frames(beats, sr=sr, hop_length=HOP), 0, chroma.shape[1] - 1)
    sync = librosa.util.sync(chroma, bf, aggregate=np.median)
    sync = sync / (np.linalg.norm(sync, axis=0, keepdims=True) + 1e-9)
    sim = sync.T @ sync
    n = sim.shape[0]
    rep = np.zeros(n)
    for i in range(n):
        far = np.r_[sim[i, : max(0, i - 8)], sim[i, i + 9:]]
        rep[i] = np.mean(np.sort(far)[-8:]) if len(far) >= 8 else 0.0
    beat_t = librosa.frames_to_time(bf, sr=sr, hop_length=HOP)
    k = min(len(rep), len(beat_t))  # sync 的欄數可能比拍點多一欄
    rep, beat_t = rep[:k], beat_t[:k]

    starts = [s for s in downbeats if s + length <= dur + 1e-6] or [max(0.0, dur - length)]
    loud = []
    reps = []
    for s in starts:
        m = (rms_t >= s) & (rms_t < s + length)
        loud.append(float(np.mean(rms[m])) if m.any() else 0.0)
        mb = (beat_t >= s) & (beat_t < s + length)
        reps.append(float(np.mean(rep[mb])) if mb.any() else 0.0)
    rise = []
    for s in starts:  # 段落開頭通常是能量突然變大的地方
        before = rms[(rms_t >= s - 4) & (rms_t < s)]
        after = rms[(rms_t >= s) & (rms_t < s + 4)]
        rise.append(float(np.mean(after) - np.mean(before)) if len(before) and len(after) else 0.0)
    score = 0.55 * _norm(np.array(loud)) + 0.25 * _norm(np.array(reps)) + 0.2 * _norm(np.array(rise))
    best = int(np.argmax(score))
    return float(starts[best]), float(starts[best] + length), float(score[best])


def analyze(path: str, length: float = 30.0) -> Analysis:
    y, sr = load(path)
    dur = len(y) / sr
    bpm, beats, downbeats = beats_and_downbeats(y, sr)
    c0, c1, sc = find_chorus(y, sr, beats, downbeats, length)
    rms = librosa.feature.rms(y=y, hop_length=HOP)[0]
    rms_t = librosa.times_like(rms, sr=sr, hop_length=HOP)
    m = (rms_t >= c0) & (rms_t < c1)
    smooth = uniform_filter1d(rms, size=43)
    peak = float(rms_t[m][np.argmax(smooth[m])]) if m.any() else c0
    return Analysis(dur, bpm, beats.tolist(), downbeats.tolist(), rms_t.tolist(), rms.tolist(), (c0, c1), sc, peak)


def best_window(a: Analysis, inside: tuple[float, float], length: float) -> tuple[float, float]:
    """在一段範圍內，找最大聲、從重拍開始的一小段（給 15 秒預告用）。"""
    lo, hi = inside
    length = min(length, hi - lo)
    t = np.array(a.rms_times)
    r = np.array(a.rms)
    cands = [d for d in a.downbeats if lo <= d and d + length <= hi + 1e-6] or [lo]
    sc = [float(np.mean(r[(t >= s) & (t < s + length)])) for s in cands]
    s = cands[int(np.argmax(sc))]
    return float(s), float(s + length)


def vocal_phrases(path: str, start: float, end: float, vocals_path: str | None = None) -> list[tuple[float, float]]:
    """找出一段時間內「有人在唱」的樂句（秒，絕對時間）。

    有 Demucs 分離出的人聲軌時用人聲軌；沒有時用「和聲成分中人聲頻段的能量」估計。
    """
    src = vocals_path or path
    y, sr = librosa.load(src, sr=SR, mono=True, offset=start, duration=end - start)
    if len(y) < sr:
        return []
    if vocals_path:
        energy = librosa.feature.rms(y=y, hop_length=HOP)[0]
    else:
        # 人聲頻段（250–4000 Hz）的能量；中值濾波去掉短促的鼓聲，保留持續的歌聲
        s = np.abs(librosa.stft(y, hop_length=HOP))
        freqs = librosa.fft_frequencies(sr=sr)
        band = (freqs >= 250) & (freqs <= 4000)
        energy = np.sqrt(np.mean(s[band] ** 2, axis=0))
        energy = median_filter(energy, size=9)
    energy = uniform_filter1d(energy, size=3)
    t = librosa.times_like(energy, sr=sr, hop_length=HOP)
    lo, hi = np.percentile(energy, 10), np.percentile(energy, 90)
    active = energy > lo + 0.4 * (hi - lo)
    phrases: list[list[float]] = []
    for on, tt in zip(active, t):
        if on:
            if phrases and tt - phrases[-1][1] <= 0.25:
                phrases[-1][1] = tt
            else:
                phrases.append([tt, tt])
    return [(start + a, start + b) for a, b in phrases if b - a >= 0.4]
