#!/bin/bash
# Script para iniciar ambiente de desenvolvimento local completo

echo "🚀 INICIANDO AMBIENTE LOCAL COMPLETO"
echo "======================================"

# Função para verificar se uma porta está em uso
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Porta $1 já está em uso"
        return 1
    else
        echo "✅ Porta $1 disponível"
        return 0
    fi
}

# Verificar portas
echo "🔍 Verificando portas..."
check_port 3000 # Backend
check_port 5173 # Frontend

echo ""
echo "📝 Para iniciar os serviços:"
echo "1. Backend:  npm run backend:local"
echo "2. Frontend: npm run dev:local"
echo ""
echo "🌐 URLs após iniciar:"
echo "• Backend:  http://localhost:3000"
echo "• Frontend: http://localhost:5173"
echo ""
