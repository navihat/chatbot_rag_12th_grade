import logging
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info("Loading multilingual-e5-large embedding model...")
        _model = SentenceTransformer("intfloat/multilingual-e5-large")
        logger.info("Embedding model ready.")
    return _model


def embed_query(text: str) -> list[float]:
    return get_model().encode(f"query: {text}", normalize_embeddings=True).tolist()


def embed_documents(texts: list[str]) -> list[list[float]]:
    prefixed = [f"passage: {t}" for t in texts]
    return get_model().encode(prefixed, normalize_embeddings=True, batch_size=8).tolist()
