# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend
```bash
cd backend
python -m venv venv && venv\Scripts\activate   # Windows
pip install -r requirements.txt

# Run server (default port 8000 via uvicorn CLI; main.py __main__ uses 8888)
uvicorn main:app --reload --port 8000
```

### Data pipeline — run once, in order, from backend/
```bash
# Step 1: OCR a single PDF → JSON per page (uses PyMuPDF + EasyOCR, ~30-60s/page on CPU)
python scripts/ocr.py --input data/pdf/sgk.pdf --output data/ocr_raw/
python scripts/ocr.py --input data/pdf/sgk.pdf --output data/ocr_raw/ --pages 1-10

# Step 2: Clean OCR text (fix formulas, strip lone page numbers, merge broken lines)
python scripts/clean.py --input data/ocr_raw/ --output data/ocr_clean/

# Step 3: Chunk → embed → upsert into ChromaDB
python scripts/ingest.py --input data/ocr_clean/
```

### Frontend
```bash
cd frontend
npm install
npm run dev       # http://localhost:3000
npm run lint
npm run type-check
```

## Architecture

```
[Next.js] → POST /chat  → StreamingResponse (SSE)
           → POST /quiz  → JSON (non-streaming)
```

**RAG flow (both `/chat` and `/quiz`):**
1. `embed_query(question)` — `intfloat/multilingual-e5-large` produces a vector
2. `query_chunks(embedding, top_k)` — ChromaDB cosine similarity search
3. Filter: keep only chunks with `score >= 0.35` (cosine similarity, not distance)
4. If none pass threshold → return hardcoded "out of scope" message; no LLM call
5. Build prompt with `[CONTEXT]` + question → stream to Groq (`llama-3.3-70b-versatile`)

**Data format:** All pipeline files (raw and clean) are JSON: `{"page": int, "source": "sgk.pdf", "text": "..."}`. Not `.txt`.

**Quiz detection (frontend-only):** `ChatWindow.tsx` checks keywords (`trắc nghiệm`, `quiz`, `tạo câu hỏi`, etc.) to decide whether to call `/quiz` or `/chat` — no AI classification.

**Quiz endpoint (`/quiz`):** Uses the same RAG retrieval as `/chat` but with a different system prompt that instructs the LLM to return strict JSON. Response is parsed with `re.search(r"\{[\s\S]+\}")` to extract JSON from the LLM output.

**History:** `/chat` receives up to the last 6 messages for context; `/quiz` is stateless.

## Key files

| File | Role |
|------|------|
| `backend/services/rag.py` | Core RAG: retrieve + stream Groq answer |
| `backend/services/quiz.py` | Quiz generation: retrieve + parse JSON from Groq |
| `backend/services/vectorstore.py` | ChromaDB singleton (`_collection`), init on startup |
| `backend/services/embeddings.py` | `multilingual-e5-large` wrapper (`embed_query`, `embed_documents`) |
| `backend/scripts/ocr.py` | PDF → per-page JSON (PyMuPDF for rendering, EasyOCR for text) |
| `backend/scripts/clean.py` | `FORMULA_MAP` regex rewrites (e.g. `H2SO4` → `H₂SO₄`) |
| `backend/scripts/ingest.py` | Reads `ocr_clean/*.json`, chunks at 400 tokens / 50 overlap, upserts |
| `frontend/lib/api.ts` | All API calls: SSE parsing for `/chat`, plain JSON for `/quiz` |
| `frontend/components/ChatWindow.tsx` | State machine: routes to `handleChatRequest` or `handleQuizRequest` |
| `frontend/components/QuizCard.tsx` | Self-contained quiz UI: per-question answer state, score summary |

## Environment variables

**`backend/.env`:**
```
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile   # optional override
CHROMA_PATH=./chroma_db
COLLECTION_NAME=hoa_hoc_12
TOP_K=5
```

**`frontend/.env.local`:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Constraints

- Chatbot answers **only** from ChromaDB content. The system prompts in `rag.py` and `quiz.py` are invariant — do not relax them at runtime.
- `MIN_SCORE = 0.35` is the gating threshold in both `rag.py` and `quiz.py`. Lowering it causes hallucination; raising it causes too many "out of scope" rejections.
- No user auth, no persistent chat history, no database — by design for MVP.
- `embed_documents` in `ingest.py` is called in batches of 32 to avoid OOM on CPU.
