"""Cấu hình cho PhoVoice VPS Web Server độc lập."""
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Đường dẫn models (ưu tiên thư mục models cục bộ, nếu chưa có thì liên kết sang dự án gốc)
MODELS_DIR = os.path.join(BASE_DIR, "models")
if not os.path.exists(MODELS_DIR) or not os.listdir(MODELS_DIR):
    SHARED_MODELS = r"d:\Code\sherpa-vietnamese-asr\models"
    if os.path.exists(SHARED_MODELS):
        MODELS_DIR = SHARED_MODELS

VOCAB_DIR = os.path.join(BASE_DIR, "vocabulary")
if not os.path.exists(VOCAB_DIR) or not os.listdir(VOCAB_DIR):
    SHARED_VOCAB = r"d:\Code\sherpa-vietnamese-asr\vocabulary"
    if os.path.exists(SHARED_VOCAB):
        VOCAB_DIR = SHARED_VOCAB

DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "phovoice_vps.db")
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Default Server Settings
HOST = os.environ.get("PHOVOICE_HOST", "0.0.0.0")
PORT = int(os.environ.get("PHOVOICE_PORT", "8000"))
DEFAULT_MODEL = os.environ.get("PHOVOICE_DEFAULT_MODEL", "68M")
