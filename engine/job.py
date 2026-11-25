"""GitHub「剪輯任務」：讀需求表單 → 下載影片 → 跑大禮包 → 把結果寫進 out/，交給工作流發佈與留言。

需求內容從環境變數 ISSUE_BODY 讀取（工作流用 env 傳入，不直接塞進指令，避免指令注入）。
"""
from __future__ import annotations

import json
import os
import re
import shutil
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from . import promo

FIELDS = {
    "影片連結": "video",
    "歌名或作品名稱": "title",
    "副歌歌詞（每行一句）": "lyrics",
    "發行或演出資訊": "info",
    "風格": "preset",
    "副歌從哪裡開始（可不填）": "start",
    "品牌或藝名（可不填）": "brand",
    "精準人聲分離": "demucs",
}
MAX_BYTES = 1_500_000_000
PRESET_WORDS = {"深夜彈唱（暖色、MV 歌詞）": "night", "器材評測（快節奏、每拍跳動）": "gear", "Live 燃炸（高對比、重拍閃光）": "live"}


def parse(body: str) -> dict:
    """GitHub 需求表單的內容是「### 欄位名稱」加一段文字。"""
    out: dict[str, str] = {}
    for block in re.split(r"^###\s+", body or "", flags=re.M)[1:]:
        label, _, value = block.partition("\n")
        key = FIELDS.get(label.strip())
        if key:
            v = value.strip()
            out[key] = "" if v in {"_No response_", "None"} else v
    return out


def to_seconds(text: str) -> float | None:
    text = (text or "").strip()
    if not text:
        return None
    m = re.fullmatch(r"(?:(\d+)[:：分])?\s*(\d+(?:\.\d+)?)\s*秒?", text)
    if not m:
        raise RuntimeError(f"看不懂「副歌從哪裡開始」：{text}，請寫成 1:20 或 80")
    return int(m.group(1) or 0) * 60 + float(m.group(2))


def first_url(text: str) -> str:
    m = re.search(r"https://[^\s)>\]]+", text or "")
    if not m:
        raise RuntimeError("找不到影片連結：請貼 https:// 開頭的網址（Google 雲端硬碟、Dropbox，或 GitHub 附件）")
    return m.group(0)


def download(url: str, dest: Path) -> Path:
    u = urllib.parse.urlparse(url)
    host = u.netloc.lower()
    if u.scheme != "https":
        raise RuntimeError("影片連結要用 https:// 開頭")
    if "drive.google.com" in host:
        m = re.search(r"/d/([\w-]+)", u.path) or re.search(r"id=([\w-]+)", u.query)
        if not m:
            raise RuntimeError("看不懂這個 Google 雲端硬碟連結，請用「分享 → 複製連結」，並設成「知道連結的人都能查看」")
        try:
            import gdown  # 處理大檔案的確認頁
            got = gdown.download(id=m.group(1), output=str(dest), quiet=True)
            if got:
                return dest
        except Exception:
            pass
        url = f"https://drive.google.com/uc?export=download&id={m.group(1)}"
    elif "dropbox.com" in host:
        url = re.sub(r"([?&])dl=0", r"\1dl=1", url) if "dl=0" in url else url + ("&" if "?" in url else "?") + "dl=1"
    headers = {"User-Agent": "ip-autopilot-engine"}
    if host in {"github.com", "user-images.githubusercontent.com"} and os.environ.get("GITHUB_TOKEN"):
        headers["Authorization"] = f"Bearer {os.environ['GITHUB_TOKEN']}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
        if "text/html" in (r.headers.get("content-type") or ""):
            raise RuntimeError("連結打開是網頁而不是影片檔：請確認分享權限是「知道連結的人都能查看」")
        n = 0
        while chunk := r.read(1 << 20):
            n += len(chunk)
            if n > MAX_BYTES:
                raise RuntimeError("影片超過 1.5 GB，請先壓縮或剪短")
            f.write(chunk)
    return dest


def overrides(comment: str) -> dict:
    """留言「重跑，從 1:20 開始，換成 Live」這類指令。"""
    o: dict[str, str] = {}
    m = re.search(r"從\s*(\d+[:：]\d+(?:\.\d+)?|\d+(?:\.\d+)?)\s*秒?\s*開始", comment or "")
    if m:
        o["start"] = m.group(1).replace("：", ":")
    for word, key in (("深夜", "night"), ("器材", "gear"), ("live", "live"), ("燃炸", "live")):
        if word in (comment or "").lower():
            o["preset"] = key
    return o


def comment(out: Path, release_url: str) -> str:
    """組出要貼回需求的留言（成品連結＋報告）。"""
    st = json.loads((out / "status.json").read_text(encoding="utf-8"))
    report = (out / "report.md").read_text(encoding="utf-8")
    if not st.get("ok"):
        return report
    base = release_url.replace("/releases/tag/", "/releases/download/")
    links = "\n".join(f"- [{f}]({base}/{urllib.parse.quote(f)})" for f in st.get("files", []))
    return f"{report}\n## 下載成品\n{links}\n\n全部檔案：{release_url}\n\n要調整的話，在這裡留言例如「重跑，從 1:20 開始，換成 Live」。\n"


def main() -> None:
    form = parse(os.environ.get("ISSUE_BODY", ""))
    form.update(overrides(os.environ.get("COMMENT_BODY", "")))
    out = Path(os.environ.get("OUT_DIR", "out"))
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir(parents=True)
    status = {"ok": False}
    try:
        url = first_url(form.get("video", ""))
        print("下載影片…", flush=True)
        src = download(url, Path("input-video"))
        res = promo.promo(
            str(src), out,
            title=form.get("title", ""), lyrics_text=form.get("lyrics", ""), info=form.get("info", ""),
            preset=PRESET_WORDS.get(form.get("preset", ""), form.get("preset", "night")), brand=form.get("brand", ""),
            use_demucs=form.get("demucs", "").startswith("要"),
            start=to_seconds(form.get("start", "")),
        )
        status = {"ok": True, **res}
    except Exception as e:  # 失敗也要讓工作流留言告訴使用者原因
        msg = str(e) if isinstance(e, RuntimeError) else f"{type(e).__name__}: {e}"
        (out / "report.md").write_text(f"# 剪輯沒有完成\n\n原因：{msg}\n\n修正後在這則需求留言「重跑」即可。\n", encoding="utf-8")
        status = {"ok": False, "error": msg}
    (out / "status.json").write_text(json.dumps(status, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"ok": status["ok"]}), flush=True)
    if not status["ok"]:
        sys.exit(0)  # 讓工作流繼續去留言
