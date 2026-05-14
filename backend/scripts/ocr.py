#!/usr/bin/env python3
"""
Bước 1: Chuyển PDF scan → text thô bằng EasyOCR + PyMuPDF.
Chạy từ thư mục backend/:
  python scripts/ocr.py --input data/pdf/sgk.pdf --output data/ocr_raw/
  python scripts/ocr.py --input data/pdf/sgk.pdf --output data/ocr_raw/ --pages 1-10
"""
import sys
import io

# Fix Windows console cp1252 → UTF-8 (EasyOCR progress bar dùng ký tự █)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import argparse
import json
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def parse_page_range(page_arg: str, total: int) -> list[int]:
    if not page_arg:
        return list(range(total))
    start_s, _, end_s = page_arg.partition("-")
    start = int(start_s) - 1
    end = int(end_s) if end_s else int(start_s)
    return list(range(max(0, start), min(end, total)))


def run_ocr(pdf_path: Path, output_dir: Path, page_indices: list[int]) -> None:
    import fitz  # pymupdf
    import easyocr

    output_dir.mkdir(parents=True, exist_ok=True)
    logger.info("Initializing EasyOCR (first run downloads model ~500MB)...")
    reader = easyocr.Reader(["vi", "en"], gpu=False)

    doc = fitz.open(str(pdf_path))
    logger.info(f"PDF: {doc.page_count} pages total. Processing {len(page_indices)} pages.")

    for idx in page_indices:
        page_num = idx + 1
        logger.info(f"OCR page {page_num}/{doc.page_count}...")

        page = doc[idx]
        mat = fitz.Matrix(300 / 72, 300 / 72)  # 300 DPI
        pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
        img_bytes = pix.tobytes("png")

        ocr_lines = reader.readtext(img_bytes, detail=0, paragraph=True)
        text = "\n".join(ocr_lines)

        out = {"page": page_num, "source": pdf_path.name, "text": text}
        out_file = output_dir / f"page_{page_num:04d}.json"
        out_file.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.info(f"  Saved {len(text)} chars → {out_file.name}")

    doc.close()
    logger.info(f"OCR complete. {len(page_indices)} pages in {output_dir}")


def main() -> None:
    parser = argparse.ArgumentParser(description="OCR PDF scan → JSON text")
    parser.add_argument("--input", required=True, help="Path to PDF file")
    parser.add_argument("--output", required=True, help="Output directory")
    parser.add_argument("--pages", default="", help="Page range e.g. '1-10' (default: all)")
    args = parser.parse_args()

    pdf_path = Path(args.input)
    if not pdf_path.exists():
        logger.error(f"PDF not found: {pdf_path}")
        sys.exit(1)

    import fitz
    doc = fitz.open(str(pdf_path))
    total = doc.page_count
    doc.close()

    page_indices = parse_page_range(args.pages, total)
    run_ocr(pdf_path, Path(args.output), page_indices)


if __name__ == "__main__":
    main()
