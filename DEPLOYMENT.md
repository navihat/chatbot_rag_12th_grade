# Deployment

## Render backend

The backend is configured to run in lightweight text-retrieval mode on Render's
512 MiB free instance. This avoids loading ChromaDB, PyTorch,
sentence-transformers, EasyOCR, and PyMuPDF during web startup.

Use these Render settings if you configure the service manually:

```text
Build Command: uv sync --no-dev
Start Command: uv run uvicorn main:app --app-dir backend --host 0.0.0.0 --port $PORT
```

Required environment variables:

```text
SUPABASE_DATABASE_URL=<your Supabase Postgres connection string>
GROQ_API_KEY=<your Groq API key>
SECRET_KEY=<a long random secret>
RAG_RETRIEVAL_MODE=text
```

For local ChromaDB ingestion or vector retrieval, install the optional ingest
dependencies:

```bash
uv sync --extra ingest
```

Then set `RAG_RETRIEVAL_MODE=vector` when you want the app to use ChromaDB and
the local sentence-transformers model.
