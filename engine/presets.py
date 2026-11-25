"""三種一鍵風格。每個風格決定：調色、重拍特效、歌詞樣式、波形顏色。"""

PRESETS = {
    "night": {
        "name": "深夜彈唱",
        "grade": "eq=contrast=1.04:saturation=0.92:gamma=1.02,colorbalance=rs=0.06:gs=0.01:bs=-0.06:rm=0.04:bm=-0.04,vignette=PI/4.5",
        "zoom": 0.035,  # 重拍時輕微放大的幅度
        "flash": 0.0,
        "every_beat": False,
        "lyric_style": "mv",
        "wave": "0xFFE2B8",
        "font": "Noto Sans CJK TC",
        "accent": "&H0094C8FF",  # ASS 顏色（&HAABBGGRR）：暖金
    },
    "gear": {
        "name": "器材評測",
        "grade": "eq=contrast=1.1:saturation=1.05,unsharp=5:5:0.6",
        "zoom": 0.05,
        "flash": 0.0,
        "every_beat": True,
        "lyric_style": "bold",
        "wave": "0x4FD1FF",
        "font": "Noto Sans CJK TC",
        "accent": "&H00FFD14F",  # 亮藍
    },
    "live": {
        "name": "Live 燃炸",
        "grade": "eq=contrast=1.2:saturation=1.3:gamma=0.96,vignette=PI/5",
        "zoom": 0.07,
        "flash": 0.22,
        "every_beat": False,
        "lyric_style": "bold",
        "wave": "0xFF4F6D",
        "font": "Noto Sans CJK TC",
        "accent": "&H006D4FFF",  # 熱紅
    },
}

ALIASES = {"深夜彈唱": "night", "深夜吉他彈唱風": "night", "器材評測": "gear", "硬核器材評測風": "gear", "live": "live", "Live 燃炸": "live", "Live 現場燃炸風": "live"}


def get(name: str) -> tuple[str, dict]:
    key = name if name in PRESETS else ALIASES.get((name or "").strip(), "night")
    return key, PRESETS[key]
