---
name: music-engine
description: 維護與擴充 AI 音樂剪輯引擎（engine/）：節拍與副歌分析、歌詞對位、母帶處理、影片合成、風格預設、GitHub 剪輯工作流。要改剪輯效果、加風格、修剪輯問題時使用。
---

# AI 音樂剪輯引擎

先讀 `docs/MUSIC-ENGINE.md` 了解流程與設計理由。

## 檔案分工
| 檔案 | 負責 |
| --- | --- |
| `engine/analysis.py` | BPM、拍點、重拍、副歌、人聲樂句 |
| `engine/audio.py` | 抽音軌、母帶處理（`MASTER_CHAIN`、兩段式響度）、Demucs |
| `engine/lyrics.py` | 歌詞對位（`align`、`_group`）、ASS 字幕樣式、SRT |
| `engine/presets.py` | 風格預設（調色、縮放幅度、閃光、字幕樣式、顏色） |
| `engine/render.py` | FFmpeg 濾鏡圖：直式、重拍縮放、閃光、音波、字幕 |
| `engine/promo.py` | 大禮包流程、報告 |
| `engine/copywriter.py` | 宣傳文案（規則要和網站 `systemPrompt` 一致） |
| `engine/job.py` | GitHub 需求表單解析、下載影片、留言內容 |
| `.github/workflows/edit.yml`、`.github/ISSUE_TEMPLATE/edit.yml` | 雲端剪輯工作流與表單 |

## 不能違反
- 只用可商用的授權：Librosa、NumPy、SciPy、FFmpeg、Demucs（MIT）。**不要加 madmom**（模型非商業授權）。加任何新套件前先確認授權並寫進文件。
- `librosa.load` 只讀音訊檔，影片一律先 `audio.extract_wav`。
- 表單欄位名稱（`job.FIELDS`、`job.PRESET_WORDS`）要和 `.github/ISSUE_TEMPLATE/edit.yml` 的 `label`、選項文字完全一致。表單欄位 id 不要用 `title`（會和需求標題衝突）。
- 工作流裡的需求內容一律用 `env:` 傳進程式，不能直接寫進 `run:`（避免指令注入）；只有擁有者與協作者能啟動。
- 字幕文字一律經過 `lyrics._esc`；檔名不要用使用者輸入。
- 成品規格固定：1080×1920、30fps、H.264、AAC、`+faststart`。

## 改完要驗證
```bash
sudo apt-get install ffmpeg fonts-noto-cjk   # 第一次
pip install -r engine/requirements.txt
python -m engine.tests.test_engine           # 必須全部通過
```
動到畫面效果時，另外跑一次 `python -m engine promo --video engine 測試影片 ...`，用 `ffmpeg -ss 秒數 -i 成品.mp4 -frames:v 1 x.png` 抽幾張畫面看：字有沒有被切、有沒有互相蓋住、重拍那一格是否有放大或閃光。
新的分析能力要在 `engine/tests/fixture.py` 的合成歌曲加對應段落，並在 `test_engine.py` 加測試。
