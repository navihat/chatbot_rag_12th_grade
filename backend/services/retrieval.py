import json
import logging
import os
import re
from functools import lru_cache
from pathlib import Path

logger = logging.getLogger(__name__)

TOKEN_RE = re.compile(r"\w+", re.UNICODE)
BACKEND_DIR = Path(__file__).resolve().parent.parent
TEXT_DATA_DIR = BACKEND_DIR / "data" / "ocr_clean"
STOPWORDS = {
    "ban",
    "bạn",
    "cho",
    "cua",
    "của",
    "cac",
    "các",
    "hay",
    "hãy",
    "la",
    "là",
    "mot",
    "một",
    "nay",
    "này",
    "nhung",
    "những",
    "noi",
    "nói",
    "the",
    "thế",
    "trong",
    "ve",
    "về",
    "va",
    "và",
}


def _retrieval_mode() -> str:
    return os.getenv("RAG_RETRIEVAL_MODE", "text").strip().lower()


def init_retrieval() -> None:
    mode = _retrieval_mode()
    if mode == "vector":
        from services.vectorstore import init_vectorstore

        init_vectorstore()
        return

    pages = _load_text_pages()
    logger.info("Text retriever ready - loaded %s SGK pages.", len(pages))


def retrieve_chunks(query: str, top_k: int = 5, min_score: float = 0.0) -> list[dict]:
    if _retrieval_mode() == "vector":
        from services.embeddings import embed_query
        from services.vectorstore import query_chunks

        chunks = query_chunks(embed_query(query), top_k=top_k)
        return [chunk for chunk in chunks if chunk["score"] >= min_score]

    chunks = _query_text_pages(query, top_k=top_k)
    return [chunk for chunk in chunks if chunk["score"] >= min_score]


@lru_cache(maxsize=1)
def _load_text_pages() -> tuple[dict, ...]:
    if not TEXT_DATA_DIR.exists():
        logger.warning("Text data directory not found: %s", TEXT_DATA_DIR)
        return tuple()

    pages: list[dict] = []
    for path in sorted(TEXT_DATA_DIR.glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            logger.warning("Skipping unreadable OCR page %s: %s", path.name, exc)
            continue

        text = str(data.get("text", "")).strip()
        if not text:
            continue

        pages.append(
            {
                "text": text,
                "metadata": {
                    "source": data.get("source", path.name),
                    "page": data.get("page"),
                },
                "tokens": set(_tokenize(text)),
            }
        )

    return tuple(pages)


def _query_text_pages(query: str, top_k: int) -> list[dict]:
    query_tokens = set(_tokenize(query))
    if not query_tokens:
        return []

    ranked: list[dict] = []
    for page in _load_text_pages():
        overlap = query_tokens & page["tokens"]
        if not overlap:
            continue

        score = len(overlap) / min(len(query_tokens), 8)
        ranked.append(
            {
                "text": _trim_text(page["text"], query_tokens),
                "metadata": page["metadata"],
                "score": score,
            }
        )

    ranked.sort(key=lambda chunk: chunk["score"], reverse=True)
    return ranked[:top_k]


def _tokenize(text: str) -> list[str]:
    return [
        token.lower()
        for token in TOKEN_RE.findall(text)
        if len(token) > 1 and token.lower() not in STOPWORDS
    ]


def _trim_text(text: str, query_tokens: set[str], max_chars: int = 1800) -> str:
    lower_text = text.lower()
    match_positions = [lower_text.find(token) for token in query_tokens]
    match_positions = [pos for pos in match_positions if pos >= 0]

    if not match_positions or len(text) <= max_chars:
        return text[:max_chars]

    center = min(match_positions)
    start = max(0, center - max_chars // 3)
    end = min(len(text), start + max_chars)
    return text[start:end].strip()
