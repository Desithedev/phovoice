# 🎙️ PhoVoice AI — Standalone VPS Web Server (React + FastAPI)

Dự án Web App nhận dạng giọng nói Tiếng Việt độc lập, giao diện **React 18 + Vite** chuẩn **Google Stitch Design**, tối ưu chạy trên VPS hoặc máy tính cá nhân.

---

## 🌟 Tính Năng Nổi Bật:
1. **Tự động tải Model thông minh (Auto Model Downloader)**: Khi khởi chạy lần đầu trên VPS sạch hoặc máy mới, server tự động tải & giải nén các mô hình Sherpa-ONNX Zipformer 68M/30M, ViBERT-Capu và Silero VAD từ GitHub/HuggingFace mà không cần cấu hình thủ công.
2. **Hiệu ứng sóng âm động (Real-time Audio Visualizer)**: Hiển thị sóng âm gradient khi nói vào micro hoặc phát lại âm thanh.
3. **Chuyển đổi file thông minh**: Kéo thả file âm thanh `.mp3`, `.wav`, `.m4a` $\rightarrow$ Nhận dạng tiếng Việt chính xác và tự động thêm dấu câu với ViBERT-Capu.
4. **Bảng tiến độ trực quan**: Thanh tiến trình Neon chạy `%`, đếm giây thực và bảng 4 giai đoạn AI.
5. **Chỉnh sửa trực tiếp vào Transcript**: Nhấp chuột sửa chữ tức thì trên từng câu, tua nghe lại đúng vị trí âm thanh khi bấm vào mốc thời gian `[00:12.4]`.
6. **Thu âm trực tiếp (Realtime Streaming)**: Nhận dạng trực tiếp từ Micro điện thoại / máy tính qua WebSocket, chữ hiển thị theo thời gian thực và tự động thêm dấu câu khi dừng nói.
7. **Giảng đường AI (Classroom Mode)**: 
   * Tóm tắt bài giảng & Lập dàn ý cấu trúc.
   * **Flashcards thuật ngữ 3D**: Chạm vào thẻ để lật xem định nghĩa với hiệu ứng xoay 3D mượt mà.
   * **Bộ trắc nghiệm tương tác**: Chọn đáp án A/B/C/D với chấm điểm và giải thích tức thì.
8. **Lịch sử phiên & Trợ lý Copilot AI**: Lưu trữ lịch sử SQLite và hỗ trợ hỏi đáp trực tiếp với LLM (DeepSeek / OpenAI / Ollama).
9. **Tương thích hoàn hảo Mobile & Desktop**: Thanh Bottom Navigation mượt mà trên iPhone/Android và Bento Grid trên Desktop.

---

## 🚀 Hướng Dẫn Khởi Chạy

### 1. Khởi Chạy Backend (FastAPI Server):
```bash
# Tại thư mục phovoice-vps-web:
python server.py
```
*(Server sẽ tự động tải các model cần thiết nếu chưa có và khởi động tại cổng `8000`)*.

### 2. Tùy Chọn: Tải trước toàn bộ Model thủ công (Offline Pre-download):
```bash
python download_models.py
```

### 3. Khởi Chạy Giao Diện React (Vite Dev Server):
```bash
cd frontend
npm install
npm run dev
```
*(Trình duyệt mở tại `http://localhost:3000` với tính năng Hot Module Reloading siêu mượt)*.

### 4. Đóng Gói Production Cho VPS (Build Static):
```bash
cd frontend
npm run build
```
*(File build sẽ được đưa vào thư mục `static/` và FastAPI sẽ phục vụ trực tiếp tại cổng `8000` mà không cần chạy thêm Node.js trên VPS!)*
