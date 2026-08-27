#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=================================================================="
echo "  🚀 PHOVOICE AI — TỰ ĐỘNG TẢI MÔ HÌNH NHẬN DẠNG CHO VPS LINUX"
echo "=================================================================="

python3 download_models.py
