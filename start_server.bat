@echo off
chcp 65001 >nul
title PhoVoice AI Web Server

echo ==================================================================
echo   🚀 KHỞI ĐỘNG PHOVOICE AI WEB SERVER (DỰ ÁN ĐỘC LẬP)
echo ==================================================================

cd /d "%~dp0"
python server.py
pause
