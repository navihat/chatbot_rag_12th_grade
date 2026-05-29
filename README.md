# 🧪 Chatbot Hóa Học Lớp 12 - Trợ Lý Học Tập RAG Thông Minh

Hệ thống Chatbot hỗ trợ học tập môn Hóa học lớp 12 (Sách giáo khoa Kết nối tri thức) sử dụng kiến trúc **RAG (Retrieval-Augmented Generation)** hiện đại. Dự án kết hợp công nghệ xử lý dữ liệu thông minh, cơ sở dữ liệu vector để đảm bảo thông tin trả lời luôn chính xác, khách quan và bám sát chương trình học.

---

## ✨ Tính Năng Nổi Bật

### 💬 1. Trợ Lý Hỏi Đáp RAG Trực Tuyến (Hóa Học 12)
- **Hỏi đáp thông minh:** Trả lời các câu hỏi lý thuyết lý hóa, bài tập và kiến thức Hóa học 12 bám sát 100% nội dung SGK Kết nối tri thức.
- **Tránh ảo tưởng (Anti-Hallucination):** Ràng buộc LLM chỉ trả lời dựa vào ngữ cảnh dữ liệu thực tế từ SGK. Nếu câu hỏi nằm ngoài phạm vi, chatbot sẽ từ chối trả lời một cách lịch sự để đảm bảo tính giáo khoa.
- **Dẫn nguồn minh bạch:** Hiển thị rõ ràng các trang sách tham chiếu chứa thông tin trả lời, giúp học sinh dễ dàng tra cứu lại.
- **Phản hồi thời gian thực (Streaming):** Sử dụng `EventSource (Server-Sent Events)` để truyền dữ liệu dạng dòng (stream), mang lại trải nghiệm phản hồi mượt mà và tức thì.
- **Chuẩn hóa công thức:** Tự động định dạng các công thức hóa học phức tạp dưới dạng Unicode chuẩn xác (ví dụ: `H₂SO₄`, `Fe₂O₃`, `HNO₃`).

### 📝 2. Trình Tạo Câu Hỏi Trắc Nghiệm Tương Tác (Interactive Quiz)
- **Tự động nhận diện ý định:** Khi người dùng yêu cầu luyện tập (ví dụ: *"tạo câu hỏi trắc nghiệm về este"*, *"trắc nghiệm carbohydrate"*), hệ thống tự động chuyển sang chế độ tạo Quiz.
- **Tạo câu hỏi bám sát kiến thức:** Truy vấn các phần nội dung liên quan trực tiếp từ sách giáo khoa trong ChromaDB để tạo ra bộ câu hỏi 4 lựa chọn (A, B, C, D).
- **Trắc nghiệm tương tác:** Học sinh có thể bấm chọn đáp án trực tiếp trên giao diện Chat. Hệ thống sẽ kiểm tra và hiển thị ngay kết quả Đúng/Sai cùng **lời giải thích chi tiết dẫn từ SGK**.

### ⚡ 3. Quy Trình OCR & Tiền Xử Lý Dữ Liệu Tự Động
Hệ thống tích hợp bộ công cụ chuyển đổi sách PDF scan thành cơ sở dữ liệu vector chất lượng cao:
- **Bước 1 (OCR):** [ocr.py](file:///d:/2025.2/Practical%20Project%20Management/chemistry-chatbot/backend/scripts/ocr.py) trích xuất chữ từ PDF scan bằng **EasyOCR + PyMuPDF**, tích hợp tăng tốc phần cứng qua **CUDA GPU (NVIDIA GTX 1650)** giúp tăng tốc độ xử lý gấp **25-30 lần** so với CPU.
- **Bước 2 (Làm sạch - Clean):** [clean.py](file:///d:/2025.2/Practical%20Project%20Management/chemistry-chatbot/backend/scripts/clean.py) chuẩn hóa cấu trúc văn bản, gộp dòng ngắt quãng và tự động dịch các công thức hóa học dạng text thường thành dạng chỉ số dưới Unicode chuẩn khoa học.
- **Bước 3 (Nạp dữ liệu - Ingestion):** [ingest.py](file:///d:/2025.2/Practical%20Project%20Management/chemistry-chatbot/backend/scripts/ingest.py) chia nhỏ văn bản (recursive chunking), chuyển đổi sang vector embeddings bằng mô hình ngôn ngữ mạnh mẽ `multilingual-e5-large` và lưu trữ vào **ChromaDB**.

---

## 🛠️ Công Nghệ Sử Dụng

### Backend (Python 3.13)
*   **FastAPI:** Khởi tạo API hiệu năng cao với cơ chế Lifespan và streaming response.
*   **ChromaDB:** Cơ sở dữ liệu vector nhúng để tìm kiếm ngữ cảnh nhanh chóng.
*   **Groq API (LLaMA 3.3 70B):** Trí tuệ nhân tạo tạo sinh phản hồi cực nhanh, thông minh.
*   **PyTorch (CUDA 12.4):** Chạy tăng tốc phần cứng cho EasyOCR và sinh embeddings.
*   **EasyOCR & PyMuPDF (Fitz):** Trích xuất văn bản từ sách PDF.

### Frontend (Next.js 15 & React)
*   **Next.js App Router & TypeScript:** Kiến trúc web hiện đại, dễ bảo trì.
*   **Tailwind CSS:** Thiết kế giao diện chatbot hiện đại, thân thiện, tương thích đa thiết bị.
*   **Server-Sent Events (SSE):** Tiếp nhận dòng phản hồi từ API Backend.

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Cấu hình Môi Trường (`.env`)
Tạo file `.env` trong thư mục [backend](file:///d:/2025.2/Practical%20Project%20Management/chemistry-chatbot/backend) dựa trên file `.env.example`:
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
EMBEDDING_DEVICE=cuda
TOP_K=5
```

---

### 2. Tiền xử lý dữ liệu SGK (Nếu cần nạp lại sách)
Đặt file sách PDF vào thư mục `backend/data/pdf/sgk.pdf` và chạy lần lượt các lệnh sau từ thư mục `backend/`:

```bash
# Bước 1: OCR trích xuất văn bản (Hỗ trợ tăng tốc GPU tự động nếu có CUDA)
uv run python scripts/ocr.py --input data/pdf/sgk.pdf --output data/ocr_raw/

# Bước 2: Làm sạch văn bản & Chuẩn hóa công thức hóa học
uv run python scripts/clean.py --input data/ocr_raw/ --output data/ocr_clean/

# Bước 3: Cắt nhỏ & Nạp vào ChromaDB vector store
uv run python scripts/ingest.py --input data/ocr_clean/
```

---

### 3. Khởi chạy Hệ Thống

#### Chạy Backend (FastAPI):
Từ thư mục `backend/` chạy lệnh:
```bash
uv run uvicorn main:app --reload --port 8000
```
Server backend sẽ chạy tại: `http://localhost:8000`

#### Chạy Frontend (Next.js):
Từ thư mục `frontend/` chạy lệnh:
```bash
npm run dev
```
Giao diện ứng dụng sẽ sẵn sàng tại: `http://localhost:3000`

---

## 📐 Cấu Trúc Thư Mục Dự Án

```text
chemistry-chatbot/
├── backend/
│   ├── data/                 # Chứa dữ liệu PDF, OCR thô và sạch
│   │   ├── pdf/sgk.pdf
│   │   ├── ocr_raw/
│   │   └── ocr_clean/
│   ├── routers/              # Các routes FastAPI (chat, quiz)
│   ├── scripts/              # Các công cụ OCR, Clean, Ingest
│   ├── services/             # Core Logic (RAG, Embeddings, VectorStore)
│   ├── main.py               # Điểm khởi chạy FastAPI Server
│   └── requirements.txt
├── frontend/
│   ├── app/                  # Next.js Pages & Layouts
│   ├── components/           # UI Components (ChatWindow, QuizCard, v.v.)
│   └── package.json
└── README.md
```
