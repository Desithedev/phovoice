@echo off
chcp 65001 >nul
title Push PhoVoice to GitHub

echo ==================================================================
echo   🚀 PUSH PHOVOICE WEB STUDIO LÊN GITHUB
echo ==================================================================

cd /d "%~dp0"

git config user.name "Desithedev"
git config user.email "nguynkhanhh2332@gmail.com"

git init
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/Desithedev/phovoice.git

git add -A
git commit -m "feat: PhoVoice Web Studio 3.0 (React 18 + Vite + FastAPI + Sherpa-ONNX Realtime)"

echo.
echo 📤 Đang đẩy mã nguồn lên https://github.com/Desithedev/phovoice...
git push -u origin main --force

echo.
echo ==================================================================
echo ✅ Đã cập nhật thành công lên GitHub!
echo ==================================================================
pause
