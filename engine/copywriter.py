"""宣傳文案：有 AI 金鑰就直接寫好；沒有就輸出完整提示詞，貼到任何 AI 都能用。

提示詞規則與網站的 systemPrompt 一致（不編造事實、缺資料標【待填】、繁中台灣用語）。
"""
from __future__ import annotations

import json
import os
import urllib.request

GUIDE = (
    "輸出 4 項：IG 貼文（150 字內，結尾一個行動呼籲＋5 個 hashtag）、IG 限時動態短句（3 句，每句 15 字內）、"
    "TikTok／YouTube Shorts 說明（封面字 12 字內＋一句說明＋5 個 hashtag）、LINE 群組提醒（80 字內）。"
)


def prompt(*, brand: str, title: str, info: str, lyrics: str, preset_name: str) -> str:
    system = "\n".join([
        f"你是「{brand or '這位音樂人'}」的社群運營助理，擅長替音樂人寫有感性、不浮誇的宣傳文案。",
        "用繁體中文與台灣用語。每段最多 2 個表情符號。",
        "絕對不要編造沒提供的事實（日期、地點、價格、票價、獎項、數字）；缺少的資訊用【待填：項目】標出。",
    ])
    task = "\n".join([
        "任務：新歌／演出宣傳",
        f"歌名或作品：{title or '【待填：歌名】'}",
        f"發行或演出資訊：{info or '【待填：日期、地點】'}",
        f"影片風格：{preset_name}",
        f"副歌歌詞：{lyrics or '（未提供）'}",
        f"要求：{GUIDE}",
        '只回傳 JSON，不要其他文字，格式：{"items":[{"label":"項目名稱","text":"可直接複製的完整內容"}]}',
    ])
    return system + "\n\n" + task


def _post(url: str, headers: dict, body: dict) -> dict:
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"content-type": "application/json", **headers})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read().decode())


def _parse(text: str) -> list[dict]:
    a, b = text.find("{"), text.rfind("}")
    data = json.loads(text[a:b + 1])
    return [{"label": str(i.get("label", "")), "text": str(i.get("text", ""))} for i in data.get("items", []) if i.get("text")]


def write(full_prompt: str) -> tuple[list[dict] | None, str]:
    """回傳 (文案項目或 None, 說明)。"""
    sys_part, _, user_part = full_prompt.partition("\n\n")
    try:
        if os.environ.get("ANTHROPIC_API_KEY"):
            out = _post("https://api.anthropic.com/v1/messages", {"x-api-key": os.environ["ANTHROPIC_API_KEY"], "anthropic-version": "2023-06-01"},
                        {"model": os.environ.get("AI_MODEL", "claude-sonnet-5-5"), "max_tokens": 2000, "system": sys_part, "messages": [{"role": "user", "content": user_part}]})
            return _parse("".join(c.get("text", "") for c in out.get("content", []))), "由 Claude 產生"
        if os.environ.get("OPENAI_API_KEY"):
            base = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
            out = _post(f"{base}/chat/completions", {"authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"},
                        {"model": os.environ.get("AI_MODEL", "gpt-4o-mini"), "messages": [{"role": "system", "content": sys_part}, {"role": "user", "content": user_part}]})
            return _parse(out["choices"][0]["message"]["content"]), "由 OpenAI 相容服務產生"
    except Exception as e:  # 文案失敗不影響影片
        return None, f"AI 文案產生失敗（{type(e).__name__}），已附上提示詞可自行貼到 AI"
    return None, "沒有設定 AI 金鑰，已附上提示詞可自行貼到 ChatGPT 或 Claude"
