@echo off
chcp 65001 > nul
echo 🚀 Iniciando Evolution API + App...
echo.

echo 📦 Subindo containers Docker...
docker-compose up -d

echo.
echo ⏳ Aguardando Evolution API iniciar...
timeout /t 5 /nobreak > nul

echo 🔍 Verificando containers:
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
echo ✅ Evolution API disponível em: http://localhost:8080
echo 🌐 App disponível em: http://localhost:3000
echo.
echo 💡 Para ver logs: docker logs evolution-api -f
echo.
echo Iniciando app...
npm run dev
