import os
import logging
import chromadb
from chromadb import Collection
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

_collection: Collection | None = None


def init_vectorstore() -> None:
    global _collection
    path = os.getenv("CHROMA_PATH", "./chroma_db")
    name = os.getenv("COLLECTION_NAME", "hoa_hoc_12")
    client = chromadb.PersistentClient(path=path)
    _collection = client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"},
    )
    logger.info(f"ChromaDB ready — '{name}' has {_collection.count()} chunks.")


def get_collection() -> Collection:
    if _collection is None:
        init_vectorstore()
    return _collection


def query_chunks(embedding: list[float], top_k: int = 5) -> list[dict]:
    col = get_collection()
    count = col.count()
    if count == 0:
        return []
    results = col.query(
        query_embeddings=[embedding],
        n_results=min(top_k, count),
        include=["documents", "metadatas", "distances"],
    )
    return [
        {"text": doc, "metadata": meta, "score": 1 - dist}
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        )
    ]


def upsert_chunks(
    ids: list[str],
    documents: list[str],
    embeddings: list[list[float]],
    metadatas: list[dict],
) -> None:
    get_collection().upsert(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas,
    )
