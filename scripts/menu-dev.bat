@echo off
title Menu de Desenvolvimento - RevalidaFlow

:menu
cls
echo ========================================
echo    REVALIDAFLOW - MENU DE DESENVOLVIMENTO
echo ========================================
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3000
echo ========================================
echo.
echo Escolha uma opção:
echo.
echo 1. Iniciar Frontend e Backend (ambos)
echo 2. Iniciar apenas Frontend
echo 3. Iniciar apenas Backend
echo 4. Verificar status dos serviços
echo 5. Parar todos os serviços
echo 6. Sair
echo.
echo ========================================
set /p opcao=Digite sua opção: 

if "%opcao%"=="1" goto opcao1
if "%opcao%"=="2" goto opcao2
if "%opcao%"=="3" goto opcao3
if "%opcao%"=="4" goto opcao4
if "%opcao%"=="5" goto opcao5
if "%opcao%"=="6" goto opcao6

echo Opção inválida. Pressione qualquer tecla para continuar...
pause >nul
goto menu

:opcao1
echo Iniciando Frontend e Backend...
start "" "iniciar-dev.bat"
goto menu

:opcao2
echo Iniciando apenas Frontend...
npm run dev
goto menu

:opcao3
echo Iniciando apenas Backend...
start "" "iniciar-backend-local.bat"
goto menu

:opcao4
echo Verificando status...
start "" "verificar-status.bat"
goto menu

:opcao5
echo Parando todos os serviços...
start "" "parar-servicos.bat"
goto menu

:opcao6
echo Saindo...
exit /b
