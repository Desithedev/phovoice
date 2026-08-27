@echo off
chcp 65001 >nul
title PhoVoice AI - Model Downloader

cd /d "%~dp0"
python download_models.py
pause
