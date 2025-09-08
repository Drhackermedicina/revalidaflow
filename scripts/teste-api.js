// teste-api.js - Script para testar a API do backend
const backendUrl = 'http://localhost:3000';

async function testarEndpoint() {
    try {
        console.log('Testando endpoint /api/create-session...');
        const response = await fetch(`${backendUrl}/api/create-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                stationId: 'teste123',
                durationMinutes: 10,
                localSessionId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            })
        });

        console.log('Status da resposta:', response.status);

        if (!response.ok) {
            const textoErro = await response.text();
            console.error('Erro na requisição:', textoErro);
            return;
        }

        const dados = await response.json();
        console.log('Resposta:', dados);
    } catch (erro) {
        console.error('Erro ao executar a requisição:', erro.message);
    }
}

testarEndpoint();
