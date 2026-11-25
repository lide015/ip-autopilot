"""歌詞對位與字幕（ASS）。

唱歌的自動辨識（尤其台語、華語）不夠準，所以由使用者貼歌詞，系統把每一行對到偵測到的人聲樂句上。
"""
from __future__ import annotations

from pathlib import Path


def clean_lines(text: str) -> list[str]:
    lines = [ln.strip() for ln in (text or "").replace("\r", "").split("\n")]
    return [ln for ln in lines if ln and ln not in {"_No response_"}][:40]


def align(lines: list[str], phrases: list[tuple[float, float]], start: float, end: float) -> list[tuple[float, float, str]]:
    """把 N 行歌詞對到樂句上，回傳 (開始, 結束, 文字)，時間相對於片段開頭。

    樂句比行數多：合併間隔最短的相鄰樂句；樂句比行數少：把最長的樂句切半。沒有樂句時平均分配。
    """
    if not lines:
        return []
    ph = [list(p) for p in phrases if p[1] > start and p[0] < end]
    # 片段一開頭被切到的半句（多半是上一段的尾巴）不算
    if len(ph) > len(lines) and ph[0][0] <= start + 0.05 and ph[0][1] - ph[0][0] < 1.0:
        ph = ph[1:]
    if not ph:
        step = (end - start) / len(lines)
        return [(round(i * step, 2), round((i + 1) * step - 0.1, 2), t) for i, t in enumerate(lines)]
    if len(ph) > len(lines):
        ph = _group(ph, len(lines))
    while len(ph) < len(lines):
        i = max(range(len(ph)), key=lambda k: ph[k][1] - ph[k][0])
        a, b = ph[i]
        mid = (a + b) / 2
        ph[i:i + 1] = [[a, mid - 0.05], [mid + 0.05, b]]
    out = []
    for (a, b), text in zip(ph, lines):
        a, b = max(a, start), min(b + 0.35, end)  # 字幕比歌聲多停留一點，比較好讀
        if b - a < 1.0:
            b = min(a + 1.0, end)
        out.append([float(round(a - start, 2)), float(round(b - start, 2)), text])
    for i in range(len(out) - 1):  # 不讓前一句蓋到下一句
        out[i][1] = min(out[i][1], out[i + 1][0] - 0.05)
    return [tuple(x) for x in out]


def _group(ph: list[list[float]], n: int) -> list[list[float]]:
    """把樂句依序分成 n 組，讓每組的唱歌時間盡量平均（最小化最長的一組）。"""
    lens = [b - a for a, b in ph]
    m = len(ph)
    inf = float("inf")
    cost = [[inf] * (n + 1) for _ in range(m + 1)]
    cut = [[0] * (n + 1) for _ in range(m + 1)]
    cost[0][0] = 0.0
    pre = [0.0]
    for x in lens:
        pre.append(pre[-1] + x)
    for i in range(1, m + 1):
        for k in range(1, min(i, n) + 1):
            for j in range(k - 1, i):
                c = max(cost[j][k - 1], pre[i] - pre[j])
                if c < cost[i][k]:
                    cost[i][k], cut[i][k] = c, j
    groups, i = [], m
    for k in range(n, 0, -1):
        j = cut[i][k]
        groups.append([ph[j][0], ph[i - 1][1]])
        i = j
    return groups[::-1]


def _ts(t: float) -> str:
    t = max(0.0, t)
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def _esc(text: str) -> str:
    return text.replace("\\", "＼").replace("{", "｛").replace("}", "｝").replace("\n", " ")


def ass(path: Path, preset: dict, *, lyrics: list[tuple[float, float, str]], title: str, sub: str, cta: str, dur: float, mode: str) -> Path:
    """產生字幕檔。mode：hook（副歌版）、mood（歌詞意境版）、teaser（預告卡點版）。"""
    font = preset["font"]
    accent = preset["accent"]
    mv = preset["lyric_style"] == "mv" or mode == "mood"
    lyric_size = 74 if mode == "mood" else 64
    lyric_style = (
        f"Style: Lyric,{font},{lyric_size},&H22FFFFFF,&H000000FF,&H00000000,&H64000000,0,0,0,0,100,100,2,0,1,0,3,2,90,90,560,1"
        if mv else
        f"Style: Lyric,{font},{lyric_size},&H00FFFFFF,&H000000FF,&H00000000,&HA0000000,-1,0,0,0,100,100,1,0,3,18,0,2,80,80,520,1"
    )
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Title,{font},88,&H00FFFFFF,&H000000FF,&H00101010,&H78000000,-1,0,0,0,100,100,2,0,1,2,3,8,80,80,220,1
Style: Sub,{font},48,{accent},&H000000FF,&H00101010,&H78000000,-1,0,0,0,100,100,1,0,1,2.5,2,8,80,80,340,1
{lyric_style}
Style: Card,{font},50,&H00FFFFFF,&H000000FF,&H00000000,&HB4000000,-1,0,0,0,100,100,1,0,3,22,0,2,70,70,230,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    if title:
        ev.append(f"Dialogue: 2,{_ts(0.2)},{_ts(min(3.2, dur))},Title,,0,0,0,,{{\\fad(250,400)}}{_esc(title)}")
    if sub:
        ev.append(f"Dialogue: 2,{_ts(0.5)},{_ts(min(3.2, dur))},Sub,,0,0,0,,{{\\fad(300,400)}}{_esc(sub)}")
    for a, b, text in lyrics:
        fx = "{\\fad(380,380)\\blur0.6}" if mv else "{\\fad(120,160)}"
        ev.append(f"Dialogue: 1,{_ts(a)},{_ts(b)},Lyric,,0,0,0,,{fx}{_esc(text)}")
    if cta:
        if mode == "teaser":
            ev.append(f"Dialogue: 3,{_ts(0.3)},{_ts(dur)},Card,,0,0,0,,{{\\fad(300,0)}}{_esc(cta)}")
        else:
            ev.append(f"Dialogue: 3,{_ts(max(0, dur - 3.5))},{_ts(dur)},Card,,0,0,0,,{{\\fad(350,0)}}{_esc(cta)}")
    path.write_text(head + "\n".join(ev) + "\n", encoding="utf-8")
    return path


def srt(path: Path, lyrics: list[tuple[float, float, str]], offset: float = 0.0) -> Path:
    def ts(t: float) -> str:
        ms = int(round(max(0.0, t) * 1000))
        h, ms = divmod(ms, 3600000)
        m, ms = divmod(ms, 60000)
        s, ms = divmod(ms, 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
    rows = [f"{i}\n{ts(a + offset)} --> {ts(b + offset)}\n{t}\n" for i, (a, b, t) in enumerate(lyrics, 1)]
    path.write_text("\n".join(rows), encoding="utf-8")
    return path
