const fs = require('fs');
const path = require('path');

console.log('Iniciando validação do formato do arquivo de configuração do MCP...');

const configPath = path.resolve(__dirname, '../../config/mcp_config.json');

try {
    if (!fs.existsSync(configPath)) {
        console.error('\n--------------------------------------------------');
        console.error('FALHA NA VERIFICAÇÃO: Arquivo de configuração "config/mcp_config.json" não encontrado.');
        console.error('--------------------------------------------------');
        console.log('\nPor favor, crie o arquivo de configuração para continuar.');
        process.exit(1);
    }

    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);

    const requiredKeys = ['CLIENT_ID', 'CLIENT_SECRET', 'REDIRECT_URI'];
    const missingKeys = [];

    console.log('Verificando a presença das seguintes chaves:', requiredKeys);

    requiredKeys.forEach(key => {
        if (!config.hasOwnProperty(key)) {
            missingKeys.push(key);
        }
    });

    if (missingKeys.length > 0) {
        console.error('\n--------------------------------------------------');
        console.error('FALHA NA VERIFICAÇÃO: O arquivo "config/mcp_config.json" está mal formatado.');
        console.error('As seguintes chaves estão ausentes:');
        missingKeys.forEach(key => console.log(`- ${key}`));
        console.error('--------------------------------------------------');
        process.exit(1);
    }

    console.log('\n--------------------------------------------------');
    console.log('SUCESSO: O arquivo "config/mcp_config.json" existe e possui as chaves necessárias.');
    console.log('--------------------------------------------------');

} catch (error) {
    if (error instanceof SyntaxError) {
        console.error('\n--------------------------------------------------');
        console.error('FALHA NA VERIFICAÇÃO: O arquivo "config/mcp_config.json" contém um JSON inválido.');
        console.error('--------------------------------------------------');
    } else {
        console.error('\n--------------------------------------------------');
        console.error('ERRO INESPERADO ao validar o arquivo de configuração:', error.message);
        console.error('--------------------------------------------------');
    }
    process.exit(1);
}