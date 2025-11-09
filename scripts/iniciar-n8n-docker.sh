#!/bin/bash
# Script para iniciar N8N local via Docker (Linux/Mac)

echo "========================================"
echo "Iniciando N8N Local via Docker"
echo "========================================"
echo ""

# Verificar se docker está instalado
if ! command -v docker &> /dev/null; then
    echo "[ERRO] Docker não encontrado!"
    echo ""
    echo "Instale o Docker em:"
    echo "  https://www.docker.com/products/docker-desktop"
    echo ""
    exit 1
fi

# Verificar se docker está rodando
if ! docker info &> /dev/null; then
    echo "[ERRO] Docker não está rodando!"
    echo ""
    echo "Inicie o Docker e tente novamente."
    echo ""
    exit 1
fi

echo "[INFO] Docker encontrado. Iniciando N8N..."
echo ""
echo "[INFO] N8N será iniciado em: http://localhost:5678"
echo "[INFO] Credenciais padrão:"
echo "[INFO]   Usuário: admin"
echo "[INFO]   Senha: admin"
echo ""
echo "[INFO] Para parar, pressione Ctrl+C ou execute:"
echo "[INFO]   docker-compose -f docker-compose.n8n.yml down"
echo ""
echo "========================================"
echo ""

# Iniciar N8N via docker-compose
docker-compose -f docker-compose.n8n.yml up -d

if [ $? -eq 0 ]; then
    echo ""
    echo "[SUCESSO] N8N iniciado com sucesso!"
    echo ""
    echo "Aguardando N8N estar pronto..."
    sleep 5
    
    echo ""
    echo "========================================"
    echo "N8N está rodando!"
    echo "========================================"
    echo "URL: http://localhost:5678"
    echo "Usuário: admin"
    echo "Senha: admin"
    echo ""
    echo "Para ver os logs:"
    echo "  docker-compose -f docker-compose.n8n.yml logs -f"
    echo ""
    echo "Para parar:"
    echo "  docker-compose -f docker-compose.n8n.yml down"
    echo ""
else
    echo ""
    echo "[ERRO] Falha ao iniciar N8N via Docker"
    echo ""
    exit 1
fi







