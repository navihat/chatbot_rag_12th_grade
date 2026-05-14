#!/usr/bin/env python3
"""
Bước 2: Làm sạch text OCR — sửa lỗi ký tự, chuẩn hóa công thức hóa học.
Chạy từ thư mục backend/:
  python scripts/clean.py --input data/ocr_raw/ --output data/ocr_clean/
"""
import argparse
import json
import logging
import re
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Chuẩn hóa công thức hóa học phổ biến trong SGK lớp 12
FORMULA_MAP = [
    (r'\bH2SO4\b', 'H₂SO₄'),
    (r'\bHNO3\b', 'HNO₃'),
    (r'\bH3PO4\b', 'H₃PO₄'),
    (r'\bH2CO3\b', 'H₂CO₃'),
    (r'\bH2S\b', 'H₂S'),
    (r'\bH2O2\b', 'H₂O₂'),
    (r'\bH2O\b', 'H₂O'),
    (r'\bCO2\b', 'CO₂'),
    (r'\bCO\b', 'CO'),
    (r'\bSO2\b', 'SO₂'),
    (r'\bSO3\b', 'SO₃'),
    (r'\bNO2\b', 'NO₂'),
    (r'\bN2O\b', 'N₂O'),
    (r'\bNH3\b', 'NH₃'),
    (r'\bCH4\b', 'CH₄'),
    (r'\bC2H6\b', 'C₂H₆'),
    (r'\bC2H4\b', 'C₂H₄'),
    (r'\bC2H2\b', 'C₂H₂'),
    (r'\bC2H5OH\b', 'C₂H₅OH'),
    (r'\bCH3OH\b', 'CH₃OH'),
    (r'\bO2\b', 'O₂'),
    (r'\bN2\b', 'N₂'),
    (r'\bH2\b', 'H₂'),
    (r'\bCl2\b', 'Cl₂'),
    (r'\bBr2\b', 'Br₂'),
    (r'\bI2\b', 'I₂'),
    (r'\bF2\b', 'F₂'),
    (r'\bFe2O3\b', 'Fe₂O₃'),
    (r'\bFe3O4\b', 'Fe₃O₄'),
    (r'\bAl2O3\b', 'Al₂O₃'),
    (r'\bCaCO3\b', 'CaCO₃'),
    (r'\bCa\(OH\)2\b', 'Ca(OH)₂'),
    (r'\bNa2CO3\b', 'Na₂CO₃'),
    (r'\bNaHCO3\b', 'NaHCO₃'),
    (r'\bCuSO4\b', 'CuSO₄'),
    (r'\bAgNO3\b', 'AgNO₃'),
    (r'\bBaSO4\b', 'BaSO₄'),
    (r'\bMgSO4\b', 'MgSO₄'),
]


def clean_text(text: str) -> str:
    lines = text.split("\n")
    kept = []
    for line in lines:
        s = line.strip()
        if len(s) < 3:
            continue
        kept.append(s)
    text = "\n".join(kept)

    # Ghép dòng bị ngắt do xuống dòng trang in
    text = re.sub(r"-\n(\w)", r"\1", text)
    # Thu gọn nhiều dòng trống liên tiếp
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Loại bỏ số trang đứng một mình (1-3 chữ số)
    text = re.sub(r"^\d{1,3}$", "", text, flags=re.MULTILINE)

    for pattern, replacement in FORMULA_MAP:
        text = re.sub(pattern, replacement, text)

    return text.strip()


def main() -> None:
    parser = argparse.ArgumentParser(description="Clean OCR text for chemistry content")
    parser.add_argument("--input", required=True, help="Directory with raw OCR JSON files")
    parser.add_argument("--output", required=True, help="Output directory for cleaned files")
    args = parser.parse_args()

    input_dir = Path(args.input)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    files = sorted(input_dir.glob("*.json"))
    logger.info(f"Cleaning {len(files)} files...")

    for f in files:
        data = json.loads(f.read_text(encoding="utf-8"))
        cleaned = clean_text(data["text"])
        out = {"page": data["page"], "source": data["source"], "text": cleaned}
        (output_dir / f.name).write_text(
            json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        logger.info(f"  {f.name}: {len(data['text'])} → {len(cleaned)} chars")

    logger.info(f"Done. {len(files)} files saved to {output_dir}")


if __name__ == "__main__":
    main()
