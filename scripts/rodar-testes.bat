@echo off
title Testes - RevalidaFlow

:menu
cls
echo ========================================
echo    REVALIDAFLOW - EXECUTAR TESTES
echo ========================================
echo.
echo Escolha o tipo de teste:
echo.
echo 1. Todos os testes
echo 2. Testes unitários
echo 3. Teste de exemplo (básico)
echo 4. Testes com cobertura
echo 5. Modo watch (observar mudanças)
echo 6. Teste específico (por nome)
echo 7. Sair
echo.
echo ========================================
set /p opcao=Digite sua opção: 

if "%opcao%"=="1" goto todos
if "%opcao%"=="2" goto unit
if "%opcao%"=="3" goto exemplo
if "%opcao%"=="4" goto cobertura
if "%opcao%"=="5" goto watch
if "%opcao%"=="6" goto especifico
if "%opcao%"=="7" goto sair

echo Opção inválida. Pressione qualquer tecla para continuar...
pause >nul
goto menu

:todos
echo Executando todos os testes...
npm test -- --run
goto fim

:unit
echo Executando testes unitários...
npm test -- tests/unit --run
goto fim

:exemplo
echo Executando teste de exemplo...
npm test -- tests/unit/exemplo.test.js --run
goto fim

:cobertura
echo Executando testes com cobertura...
npm test -- --coverage --run
goto fim

:watch
echo Executando testes em modo watch...
npm test
goto fim

:especifico
set /p nome_teste=Digite o nome do teste: 
echo Executando teste específico: %nome_teste%
npm test -- %nome_teste% --run
goto fim

:sair
echo Saindo...
exit /b

:fim
echo.
echo ========================================
echo    TESTES CONCLUÍDOS
echo ========================================
pause
goto menu