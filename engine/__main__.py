"""命令列入口。

本機：python -m engine promo --video 影片.mp4 --title 歌名 --lyrics-file 副歌.txt --info "12/20 台北" --preset night --out 成品資料夾
雲端：python -m engine job（GitHub Actions 讀取「剪輯任務」需求表單後執行）
"""
import argparse
import sys
from pathlib import Path

from . import job, promo


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="engine", description="音樂人專屬 AI 剪輯引擎")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("promo", help="一支影片 → 宣傳大禮包")
    p.add_argument("--video", required=True)
    p.add_argument("--out", default="out")
    p.add_argument("--title", default="")
    p.add_argument("--lyrics", default="", help="副歌歌詞（用 | 分行）")
    p.add_argument("--lyrics-file")
    p.add_argument("--info", default="", help="發行或演出資訊")
    p.add_argument("--preset", default="night", help="night／gear／live")
    p.add_argument("--brand", default="")
    p.add_argument("--start", type=float, help="手動指定副歌開始秒數")
    p.add_argument("--length", type=float, default=30.0, help="副歌版長度（秒）")
    p.add_argument("--teaser", type=float, default=15.0, help="預告版長度（秒）")
    p.add_argument("--demucs", action="store_true", help="用 Demucs 分離人聲，歌詞對位更準（較慢）")
    sub.add_parser("job", help="處理 GitHub「剪輯任務」需求")
    c = sub.add_parser("comment", help="產生要貼回需求的留言")
    c.add_argument("out")
    c.add_argument("release_url")
    a = ap.parse_args(argv)
    try:
        if a.cmd == "promo":
            ly = Path(a.lyrics_file).read_text(encoding="utf-8") if a.lyrics_file else a.lyrics.replace("|", "\n")
            promo.promo(a.video, Path(a.out), title=a.title, lyrics_text=ly, info=a.info, preset=a.preset,
                        brand=a.brand, length=a.length, teaser=a.teaser, use_demucs=a.demucs, start=a.start)
        elif a.cmd == "comment":
            print(job.comment(Path(a.out), a.release_url))
        else:
            job.main()
    except RuntimeError as e:
        print(f"✗ {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
