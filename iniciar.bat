@echo off
title Financeiro Psi - Iniciar

echo.
echo  ======================================
echo   FINANCEIRO PSI - INICIANDO...
echo  ======================================
echo.

echo [1/3] Verificando Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
  echo  ERRO: Docker Desktop nao esta rodando!
  echo  Abra o Docker Desktop e tente novamente.
  pause
  exit /b 1
)
echo  OK - Docker esta rodando.
echo.

echo [2/3] Subindo Evolution API (WhatsApp)...
cd /d "%~dp0"
docker-compose up -d
if %errorlevel% neq 0 (
  echo  ERRO ao subir os containers!
  echo  Verifique os logs: docker-compose logs
  pause
  exit /b 1
)
echo  OK - Evolution API rodando em http://localhost:8080
echo.

echo [3/3] Aguardando Evolution API inicializar (10s)...
timeout /t 10 /nobreak >nul

echo.
echo  ======================================
echo   TUDO PRONTO!
echo  ======================================
echo.
echo  App:           http://localhost:3000
echo  Evolution API: http://localhost:8080
echo.
echo  Iniciando o app...
echo.
npm run dev
