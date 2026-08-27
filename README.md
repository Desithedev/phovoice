# 🎙️ PhoVoice AI — Standalone VPS Web Server (React + FastAPI)

Dự án Web App nhận dạng giọng nói Tiếng Việt độc lập, giao diện **React 18 + Vite** chuẩn **Google Stitch Design**, tối ưu chạy trên VPS hoặc máy tính cá nhân.

---

## 🌟 Tính Năng Nổi Bật Của Giao Diện React Mới:
1. **Hiệu ứng sóng âm động (Real-time Audio Visualizer)**: Hiển thị sóng âm gradient khi nói vào micro hoặc phát lại âm thanh.
2. **Chuyển đổi file thông minh**: Kéo thả file âm thanh `.mp3`, `.wav`, `.m4a` $\rightarrow$ Nhận dạng tiếng Việt chính xác và tự động thêm dấu câu với ViBERT-Capu.
3. **Thu âm trực tiếp (Realtime Streaming)**: Nhận dạng trực tiếp từ Micro điện thoại / máy tính qua WebSocket, chữ hiển thị theo thời gian thực và tự động thêm dấu câu khi dừng nói.
4. **Giảng đường AI (Classroom Mode)**: 
   * Tóm tắt bài giảng & Lập dàn ý cấu trúc.
   * **Flashcards thuật ngữ 3D**: Chạm vào thẻ để lật xem định nghĩa với hiệu ứng xoay 3D mượt mà.
   * **Bộ trắc nghiệm tương tác**: Chọn đáp án A/B/C/D với chấm điểm và giải thích tức thì.
5. **Lịch sử phiên & Trợ lý Copilot AI**: Lưu trữ lịch sử SQLite và hỗ trợ hỏi đáp trực tiếp với LLM (DeepSeek / OpenAI / Ollama).
6. **Tương thích hoàn hảo Mobile & Desktop**: Thanh Bottom Navigation mượt mà trên iPhone/Android và Bento Grid trên Desktop.

---

## 🚀 Hướng Dẫn Khởi Chạy

### 1. Khởi Chạy Backend (FastAPI Server):
```bash
# Tại thư mục phovoice-vps-web:
python server.py
```
*(Server chạy tại cổng `8000`)*.

### 2. Khởi Chạy Giao Diện React (Vite Dev Server):
```bash
cd frontend
npm install
npm run dev
```
*(Trình duyệt mở tại `http://localhost:3000` với tính năng Hot Module Reloading siêu mượt)*.

### 3. Đóng Gói Production Cho VPS (Build Static):
```bash
cd frontend
npm run build
```
*(File build sẽ được đưa vào thư mục `static/` và FastAPI sẽ phục vụ trực tiếp tại cổng `8000` mà không cần chạy thêm Node.js trên VPS!)*
