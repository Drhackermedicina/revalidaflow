#!/bin/bash
# Script para iniciar N8N local no Linux/Mac

echo "========================================"
echo "Iniciando N8N Local para integracao MCP"
echo "========================================"
echo ""

# Verificar se n8n está instalado
if ! command -v n8n &> /dev/null; then
    echo "[ERRO] N8N não encontrado!"
    echo ""
    echo "Instale o N8N com:"
    echo "  npm install -g n8n"
    echo ""
    exit 1
fi

echo "[INFO] N8N encontrado. Iniciando..."
echo ""
echo "[INFO] N8N será iniciado em: http://localhost:5678"
echo "[INFO] Pressione Ctrl+C para parar"
echo ""
echo "========================================"
echo ""

# Iniciar N8N
n8n start









