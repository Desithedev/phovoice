#!/usr/bin/env bash
# Script khởi chạy PhoVoice Web Server trên Linux VPS
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=================================================================="
echo "  🚀 KHỞI ĐỘNG PHOVOICE AI WEB SERVER TRÊN LINUX VPS"
echo "=================================================================="

if ! command -v python3 &> /dev/null; then
    echo "[LỖI] Chưa cài đặt python3 trên VPS. Chạy: sudo apt install python3 python3-pip python3-venv"
    exit 1
fi

if [ ! -d ".venv" ]; then
    echo "📦 Đang tạo virtual environment .venv..."
    python3 -m venv .venv
    .venv/bin/pip install --upgrade pip
    .venv/bin/pip install -r requirements.txt
fi

echo "✨ Khởi chạy Web Server tại http://0.0.0.0:8000..."
exec .venv/bin/python server.py
