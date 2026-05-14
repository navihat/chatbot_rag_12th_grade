#!/usr/bin/env python3
"""
Bước 3: Chunk text đã làm sạch → embed → nạp vào ChromaDB.
Chạy từ thư mục backend/:
  python scripts/ingest.py --input data/ocr_clean/
"""
import argparse
import json
import logging
import sys
import uuid
from pathlib import Path

# Add backend root to path so `services` package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

CHUNK_SIZE = 400
CHUNK_OVERLAP = 50
BATCH_SIZE = 32


def chunk_file(text: str, source: str, page: int) -> list[dict]:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ".", " "],
    )
    return [
        {
            "id": str(uuid.uuid4()),
            "text": chunk,
            "metadata": {"source": source, "page": page},
        }
        for chunk in splitter.split_text(text)
        if chunk.strip()
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest cleaned OCR text into ChromaDB")
    parser.add_argument("--input", required=True, help="Directory with cleaned JSON files")
    args = parser.parse_args()

    input_dir = Path(args.input)
    files = sorted(input_dir.glob("*.json"))

    if not files:
        logger.error(f"No JSON files found in {input_dir}")
        sys.exit(1)

    logger.info(f"Loading {len(files)} pages...")
    all_chunks: list[dict] = []
    for f in files:
        data = json.loads(f.read_text(encoding="utf-8"))
        chunks = chunk_file(data["text"], data["source"], data["page"])
        all_chunks.extend(chunks)
        logger.info(f"  {f.name}: {len(chunks)} chunks")

    logger.info(f"Total: {len(all_chunks)} chunks. Embedding + upserting...")

    from services.vectorstore import init_vectorstore, upsert_chunks
    from services.embeddings import embed_documents
    init_vectorstore()

    for i in range(0, len(all_chunks), BATCH_SIZE):
        batch = all_chunks[i: i + BATCH_SIZE]
        texts = [c["text"] for c in batch]
        embeddings = embed_documents(texts)
        upsert_chunks(
            ids=[c["id"] for c in batch],
            documents=texts,
            embeddings=embeddings,
            metadatas=[c["metadata"] for c in batch],
        )
        done = min(i + BATCH_SIZE, len(all_chunks))
        logger.info(f"  Upserted {done}/{len(all_chunks)} chunks")

    logger.info("Ingest complete!")


if __name__ == "__main__":
    main()
