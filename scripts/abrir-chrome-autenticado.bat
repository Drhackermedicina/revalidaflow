@echo off
REM Script para abrir Chrome com perfil específico já autenticado
REM Use este script se você já tem uma sessão do Google ativa no Chrome

echo ========================================
echo    Abrindo Chrome com perfil autenticado
echo ========================================

REM Abrir Chrome com perfil padrão (já autenticado)
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --profile-directory=Default http://localhost:5173/app/dashboard

REM Se você tem múltiplos perfis, pode usar:
REM start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --profile-directory="Profile 1" http://localhost:5173/app/dashboard

echo Chrome aberto! Certifique-se de que você já está logado no Google neste perfil.

pause











