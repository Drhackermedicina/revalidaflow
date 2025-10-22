// Script para verificar o título e o favicon da página
const http = require('http');
const fs = require('fs');

// Opções para fazer a requisição HTTP
const options = {
  hostname: 'localhost',
  port: 5173,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    // Verificar o título da página
    const titleMatch = data.match(/<title>(.*?)<\/title>/i);
    if (titleMatch) {
      const title = titleMatch[1];
      console.log('Título da página:', title);
      
      if (title === 'REVALIDA FLOW') {
        console.log('✅ Título verificado: "REVALIDA FLOW" está correto!');
      } else {
        console.log('❌ Título incorreto. Esperado: "REVALIDA FLOW", encontrado:', title);
      }
    }
    
    // Verificar o favicon
    const faviconMatch = data.match(/<link[^>]*rel=["']icon["'][^>]*href=["'](.*?)["'][^>]*>/i);
    if (faviconMatch) {
      const favicon = faviconMatch[1];
      console.log('Caminho do favicon:', favicon);
      
      if (favicon === '/botao_rf.svg') {
        console.log('✅ Favicon verificado: "/botao_rf.svg" está correto!');
      } else {
        console.log('❌ Favicon incorreto. Esperado: "/botao_rf.svg", encontrado:', favicon);
      }
    }
    
    // Verificar se o arquivo do favicon existe
    try {
      if (fs.existsSync('./public/botao_rf.svg')) {
        console.log('✅ Arquivo do favicon existe em ./public/botao_rf.svg');
      } else {
        console.log('❌ Arquivo do favicon não encontrado em ./public/botao_rf.svg');
      }
    } catch (err) {
      console.log('❌ Erro ao verificar o arquivo do favicon:', err);
    }
  });
});

req.on('error', (e) => {
  console.error('Erro ao fazer a requisição:', e);
});

req.end();