"""PhoVoice AI — Standalone VPS Web Server (FastAPI + WebSockets + Sherpa-ONNX).
Dự án Web App độc lập, tối ưu chạy trên VPS hoặc máy tính cá nhân.
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import re
import shutil
import sqlite3
import sys
import threading
import time
import uuid
from typing import Any, Dict, List, Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

SHARED_CORE = r"d:\Code\sherpa-vietnamese-asr"
if os.path.exists(SHARED_CORE) and SHARED_CORE not in sys.path:
    sys.path.insert(0, SHARED_CORE)

try:
    import fastapi
    import uvicorn
except ImportError:
    import subprocess
    print("📦 Đang tự động cài đặt các thư viện Web Server (fastapi, uvicorn, python-multipart, websockets)...")
    req_file = os.path.join(BASE_DIR, "requirements.txt")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", req_file])
    print("✅ Đã cài đặt xong thư viện Web Server!")

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

import config

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")
logger = logging.getLogger("phovoice_web")

app = FastAPI(title="PhoVoice AI Web Server", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Database SQLite Helper ──────────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS transcript_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            filename TEXT,
            duration_s REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            model_label TEXT,
            text TEXT,
            raw_text TEXT,
            segments_json TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()


# ─── Global Singletons for Inferences ────────────────────────────────────────
_recognizers = {}
_streaming_recognizer = None
_punct_engine = None


def get_offline_asr(model_label: str = "68M"):
    if model_label in _recognizers:
        return _recognizers[model_label]
    from core.real_asr import make_asr_segments
    fn = make_asr_segments(model_label)
    _recognizers[model_label] = fn
    return fn


def get_streaming_recognizer():
    global _streaming_recognizer
    if _streaming_recognizer is None:
        import sherpa_onnx
        model_dir = os.path.join(config.MODELS_DIR, "zipformer-30m-rnnt-streaming-6000h")
        _streaming_recognizer = sherpa_onnx.OnlineRecognizer.from_transducer(
            tokens=os.path.join(model_dir, "tokens.txt"),
            encoder=os.path.join(model_dir, "encoder-epoch-31-avg-11-chunk-64-left-128.fp16.onnx"),
            decoder=os.path.join(model_dir, "decoder-epoch-31-avg-11-chunk-64-left-128.fp16.onnx"),
            joiner=os.path.join(model_dir, "joiner-epoch-31-avg-11-chunk-64-left-128.fp16.onnx"),
            num_threads=2,
            decoding_method="greedy_search",
        )
    return _streaming_recognizer


def restore_punctuation(text: str, segments: list = None):
    global _punct_engine
    if not text or not text.strip():
        return text, segments
    try:
        if _punct_engine is None:
            from core.punctuation.punctuation_engine import PunctuationEngine
            _punct_engine = PunctuationEngine(prefer_int8=True)

        norm_text = text.lower().strip()
        punct_text = _punct_engine.restore_punctuation(norm_text)

        if segments:
            for seg in segments:
                s_txt = seg.get("text", "").lower().strip()
                if s_txt:
                    seg["text"] = _punct_engine.restore_punctuation(s_txt)

        return punct_text, segments
    except Exception as e:
        logger.warning(f"Punctuation fallback: {e}")
        t = text.lower().strip()
        sentences = re.split(r'(?<=[.!?])\s+', t)
        return " ".join(s[0].upper() + s[1:] if len(s) > 0 else s for s in sentences), segments


@app.on_event("startup")
def prewarm_models():
    def _warm():
        try:
            from download_models import ensure_models_downloaded
            ensure_models_downloaded(config.MODELS_DIR)
        except Exception as e:
            logger.warning(f"Model auto-download check: {e}")

        logger.info("🔥 Đang tải sẵn model 68M và ViBERT Capu vào RAM...")
        try:
            get_offline_asr("68M")
            get_streaming_recognizer()
            restore_punctuation("xin chào việt nam")
            logger.info("✅ Đã nạp sẵn model vào RAM! Sẵn sàng nhận dạng tức thì.")
        except Exception as e:
            logger.warning(f"Prewarm notice: {e}")
    threading.Thread(target=_warm, daemon=True).start()


# ─── REST APIs ───────────────────────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    import psutil
    return {
        "status": "healthy",
        "service": "PhoVoice AI Standalone Web Server",
        "cpu_usage_pct": psutil.cpu_percent(),
        "ram_usage_pct": psutil.virtual_memory().percent,
    }


@app.get("/api/models")
def list_models():
    return [
        {"id": "68M", "name": "⚖️ BALANCED — Zipformer 68M (Chuẩn mực, Đầy đủ)", "profile": "BALANCED"},
        {"id": "30M", "name": "⚡ FAST — Zipformer 30M (Siêu nhanh)", "profile": "FAST"},
        {"id": "VI-EN", "name": "🌐 VI-EN — NghiASR INT8 (Thuật ngữ CNTT)", "profile": "VI-EN"},
        {"id": "MULTILINGUAL", "name": "🌍 MULTILINGUAL — PengCheng Starling", "profile": "MULTILINGUAL"},
    ]


@app.post("/api/transcribe")
async def transcribe_file(
    file: UploadFile = File(...),
    model: str = Form("68M"),
    punctuate: bool = Form(True),
    title: Optional[str] = Form(None)
):
    try:
        temp_id = uuid.uuid4().hex[:8]
        saved_name = f"{temp_id}_{file.filename}"
        saved_path = os.path.join(config.UPLOAD_DIR, saved_name)

        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        from core.real_asr import ensure_wav16k
        wav_path = ensure_wav16k(saved_path)

        t0 = time.perf_counter()
        asr_fn = get_offline_asr(model)
        result = asr_fn(wav_path)
        proc_time = time.perf_counter() - t0

        raw_text = result.get("text", "").strip()
        segments = result.get("segments", [])
        duration_s = result.get("duration_s", 0.0)

        final_text = raw_text
        if punctuate:
            final_text, segments = restore_punctuation(raw_text, segments)

        doc_title = title or os.path.splitext(file.filename)[0]

        conn = sqlite3.connect(config.DB_PATH)
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO transcript_sessions (title, filename, duration_s, model_label, text, raw_text, segments_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (doc_title, file.filename, duration_s, model, final_text, raw_text, json.dumps(segments, ensure_ascii=False)))
        session_id = cur.lastrowid
        conn.commit()
        conn.close()

        return {
            "id": session_id,
            "title": doc_title,
            "filename": file.filename,
            "duration_s": round(duration_s, 2),
            "processing_time_s": round(proc_time, 2),
            "rtf": round(proc_time / max(duration_s, 1e-6), 3),
            "text": final_text,
            "raw_text": raw_text,
            "segments": segments,
        }
    except Exception as exc:
        logger.error(f"Transcribe error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/punctuate")
async def punctuate_text(payload: Dict[str, Any]):
    raw = payload.get("text", "")
    punct_text, _ = restore_punctuation(raw)
    return {"text": punct_text}


@app.post("/api/llm/chat")
async def ask_llm(payload: Dict[str, Any]):
    transcript_text = payload.get("transcript", "")
    question = payload.get("question", "")
    api_url = payload.get("api_url")
    api_key = payload.get("api_key")
    model = payload.get("model", "deepseek-chat")

    if not question.strip():
        raise HTTPException(status_code=400, detail="Vui lòng nhập câu hỏi.")

    from core.ai_layer.llm_service import LLMService
    llm = LLMService(api_url=api_url or None, api_key=api_key or None, model=model)
    prompt = f"Dưới đây là nội dung transcript bài nói/bài giảng:\n\"\"\"\n{transcript_text}\n\"\"\"\n\nYêu cầu / Câu hỏi của người dùng:\n{question}\n\nHãy trả lời chi tiết, chính xác, định dạng Markdown rõ ràng."
    ans = llm._call_llm(prompt)
    if not ans:
        ans = "⚠️ Không nhận được phản hồi từ LLM API. Vui lòng kiểm tra lại API Key hoặc đổi sang provider khác."
    return {"answer": ans}


@app.post("/api/llm/classroom")
async def classroom_ai(payload: Dict[str, Any]):
    transcript_text = payload.get("transcript", "")
    api_url = payload.get("api_url")
    api_key = payload.get("api_key")
    model = payload.get("model", "deepseek-chat")

    from core.ai_layer.llm_service import LLMService
    llm = LLMService(api_url=api_url or None, api_key=api_key or None, model=model)

    summary = llm.generate_summary(transcript_text)
    outline = llm.generate_outline(transcript_text)
    flashcards = llm.generate_flashcards(transcript_text)
    quizzes = llm.generate_quiz(transcript_text)

    return {
        "summary": summary,
        "outline": outline,
        "flashcards": flashcards,
        "quizzes": quizzes,
    }


@app.get("/api/history")
def get_history():
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT id, title, filename, duration_s, created_at, model_label, text FROM transcript_sessions ORDER BY id DESC LIMIT 100")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


@app.get("/api/history/{session_id}")
def get_session(session_id: int):
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM transcript_sessions WHERE id = ?", (session_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên làm việc.")
    d = dict(row)
    if d.get("segments_json"):
        try:
            d["segments"] = json.loads(d["segments_json"])
        except Exception:
            d["segments"] = []
    return d


@app.delete("/api/history/{session_id}")
def delete_session(session_id: int):
    conn = sqlite3.connect(config.DB_PATH)
    cur = conn.cursor()
    cur.execute("DELETE FROM transcript_sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


# ─── WebSocket Streaming Endpoint (Microphone Mobile / Browser) ───────────────

@app.websocket("/api/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket client connected for audio streaming.")
    import numpy as np

    rec = get_streaming_recognizer()
    stream = rec.create_stream()
    history = []

    try:
        while True:
            data = await websocket.receive_bytes()
            if not data:
                continue

            pcm = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0
            stream.accept_waveform(16000, pcm)

            while rec.is_ready(stream):
                rec.decode_stream(stream)

            res = rec.get_result(stream).strip().lower()

            if hasattr(rec, "is_endpoint") and rec.is_endpoint(stream):
                if res:
                    history.append(res[0].upper() + res[1:] if len(res) > 0 else res)
                    rec.reset(stream)
                    res = ""

            if history:
                history_text = ". ".join(history) + "."
                full_text = f"{history_text} {res}".strip() if res else history_text
            elif res:
                full_text = res[0].upper() + res[1:] if len(res) > 0 else res
            else:
                full_text = ""

            await websocket.send_json({
                "partial": res,
                "full_text": full_text
            })

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected.")
    except Exception as e:
        logger.warning(f"WebSocket error: {e}")
    finally:
        try:
            stream.input_finished()
            while rec.is_ready(stream):
                rec.decode_stream(stream)
            final_res = rec.get_result(stream).strip().lower()
            if final_res:
                history.append(final_res[0].upper() + final_res[1:] if len(final_res) > 0 else final_res)
        except Exception:
            pass


# ─── Mount Static Files & SPA Frontend ───────────────────────────────────────
STATIC_DIR = os.path.join(BASE_DIR, "static")
os.makedirs(STATIC_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/favicon.ico")
def favicon():
    svg_icon = """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%2310b981'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-size='50' fill='white'>🎙️</text></svg>"""
    return Response(content=svg_icon, media_type="image/svg+xml")

@app.get("/")
def serve_index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


if __name__ == "__main__":
    import uvicorn
    logger.info(f"🚀 PhoVoice Standalone Web Server đang chạy tại http://{config.HOST}:{config.PORT}")
    uvicorn.run(app, host=config.HOST, port=config.PORT, log_level="info")
