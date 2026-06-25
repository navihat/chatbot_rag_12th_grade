# Chatbot Hóa học 12

Ứng dụng trợ lý học tập môn Hóa học lớp 12 theo SGK Kết nối tri thức. Dự án dùng kiến trúc RAG (Retrieval-Augmented Generation) để truy xuất nội dung sách giáo khoa từ ChromaDB, sau đó tạo câu trả lời, câu hỏi trắc nghiệm và bài đánh giá năng lực bằng Groq API.

## Tính năng chính

- Hỏi đáp Hóa học 12 dựa trên dữ liệu SGK đã được OCR, làm sạch và nạp vào vector store.
- Trả lời dạng streaming qua Server-Sent Events để giao diện nhận nội dung từng phần.
- Hiển thị nguồn tham khảo theo metadata `source` và `page` của các đoạn dữ liệu được truy xuất.
- Tạo câu hỏi trắc nghiệm tương tác khi người dùng yêu cầu luyện tập, quiz hoặc đề thi.
- Đăng ký, đăng nhập bằng email/mật khẩu; xác thực các API học tập bằng JWT.
- Lưu lịch sử chat, quiz và tiến độ học tập vào Supabase/Postgres.
- Đánh giá năng lực theo chương với 10 câu hỏi, tính Mastery Score và phân loại `Novice`, `Proficient`, `Expert`.

## Công nghệ sử dụng

### Backend

- Python 3.13
- FastAPI
- Supabase/Postgres
- ChromaDB
- Sentence Transformers với model `intfloat/multilingual-e5-large`
- Groq API
- EasyOCR và PyMuPDF cho quy trình OCR PDF
- `python-jose` cho JWT

### Frontend

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS

## Cấu trúc thư mục

```text
chemistry-chatbot/
├── backend/
│   ├── data/
│   │   ├── diagnostic_bank.json
│   │   └── ocr_clean/
│   ├── routers/
│   │   ├── assessment.py
│   │   ├── auth.py
│   │   ├── chat.py
│   │   └── quiz.py
│   ├── scripts/
│   │   ├── clean.py
│   │   ├── ingest.py
│   │   └── ocr.py
│   ├── services/
│   │   ├── assessment.py
│   │   ├── auth.py
│   │   ├── db.py
│   │   ├── embeddings.py
│   │   ├── rag.py
│   │   ├── quiz.py
│   │   └── vectorstore.py
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── package.json
├── pyproject.toml
├── uv.lock
└── README.md
```

## Yêu cầu môi trường

- Python `>=3.13`
- Node.js phù hợp với Next.js 15
- `npm`
- `uv` nếu muốn dùng lockfile Python ở thư mục gốc
- Groq API key
- Supabase Postgres connection string

Lần đầu chạy embedding hoặc OCR có thể cần tải model từ internet. Nếu dùng EasyOCR GPU, máy cần cài đặt môi trường CUDA/PyTorch phù hợp.

## Cấu hình biến môi trường

Tạo file `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
SECRET_KEY=replace-with-a-long-random-secret
SUPABASE_DATABASE_URL=postgresql://postgres.xxxxxxxxx:your_password@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require
TOP_K=5
CHROMA_PATH=./chroma_db
COLLECTION_NAME=hoa_hoc_12
```

Tạo file `frontend/.env.local` nếu backend không chạy ở URL mặc định:

```env
NEXT_PUBLIC_API_URL=http://localhost:8888
```

Nếu không khai báo `NEXT_PUBLIC_API_URL`, frontend sẽ tự dùng `http://localhost:8888`.

## Cài đặt và chạy dự án

### 1. Cài đặt backend

Từ thư mục gốc dự án:

```bash
uv sync
```

Hoặc dùng `pip` trong môi trường Python riêng:

```bash
pip install -r backend/requirements.txt
```

### 2. Chạy backend

Từ thư mục `backend/`:

```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8888
```

Backend chạy tại:

```text
http://localhost:8888
```

Kiểm tra nhanh:

```text
GET http://localhost:8888/health
```

### 3. Cài đặt frontend

Từ thư mục `frontend/`:

```bash
npm install
```

### 4. Chạy frontend

Từ thư mục `frontend/`:

```bash
npm run dev
```

Frontend chạy tại:

```text
http://localhost:3000
```

## Quy trình chuẩn bị dữ liệu SGK

Dự án có sẵn dữ liệu OCR đã làm sạch trong `backend/data/ocr_clean/`. Nếu cần nạp lại từ PDF, đặt file PDF vào ví dụ `backend/data/pdf/sgk.pdf`, rồi chạy từ thư mục `backend/`.

### 1. OCR PDF sang JSON thô

```bash
uv run python scripts/ocr.py --input data/pdf/sgk.pdf --output data/ocr_raw/
```

Có thể OCR một khoảng trang:

```bash
uv run python scripts/ocr.py --input data/pdf/sgk.pdf --output data/ocr_raw/ --pages 1-10
```

### 2. Làm sạch dữ liệu OCR

```bash
uv run python scripts/clean.py --input data/ocr_raw/ --output data/ocr_clean/
```

Script này lọc dòng nhiễu, gộp dòng bị ngắt và chuẩn hóa một số công thức hóa học phổ biến.

### 3. Nạp dữ liệu vào ChromaDB

```bash
uv run python scripts/ingest.py --input data/ocr_clean/
```

Script `ingest.py` sẽ chia nhỏ nội dung, tạo embeddings bằng `intfloat/multilingual-e5-large`, rồi upsert vào collection ChromaDB được cấu hình bằng `CHROMA_PATH` và `COLLECTION_NAME`.

## API chính

Các endpoint học tập yêu cầu header:

```text
Authorization: Bearer <token>
```

| Method   | Endpoint                                      | Mô tả                                       |
| -------- | --------------------------------------------- | --------------------------------------------- |
| `POST` | `/auth/register`                            | Đăng ký tài khoản và trả về JWT       |
| `POST` | `/auth/login`                               | Đăng nhập và trả về JWT                 |
| `POST` | `/chat`                                     | Chat RAG dạng streaming SSE                  |
| `GET`  | `/chat/history`                             | Lấy lịch sử chat của người dùng        |
| `POST` | `/chat/history/clear`                       | Xóa lịch sử chat                           |
| `POST` | `/quiz`                                     | Tạo quiz trắc nghiệm theo yêu cầu        |
| `GET`  | `/assessment/chapter/questions?chapter=...` | Tạo bài đánh giá 10 câu theo chương   |
| `POST` | `/assessment/chapter/submit`                | Nộp bài đánh giá và tính Mastery Score |
| `GET`  | `/assessment/mastery`                       | Lấy trạng thái thông thạo theo chương  |
| `GET`  | `/health`                                   | Kiểm tra backend                             |

## Ghi chú vận hành

- User, lịch sử chat và kết quả đánh giá được lưu trong Supabase/Postgres qua `SUPABASE_DATABASE_URL`.
- `backend/data/*.db`, `backend/chroma_db/`, `backend/data/pdf/` và `backend/data/ocr_raw/` là dữ liệu local/generate, không commit lên Git.
- Nếu ChromaDB rỗng, chatbot và quiz sẽ không có ngữ cảnh SGK để trả lời; hãy chạy bước `ingest.py`.
- `SECRET_KEY` mặc định trong code là `change-me`; cần thay bằng chuỗi bí mật riêng khi chạy thật.
- Backend hiện cho phép CORS `*`, thuận tiện cho phát triển local nhưng nên giới hạn origin khi triển khai.
