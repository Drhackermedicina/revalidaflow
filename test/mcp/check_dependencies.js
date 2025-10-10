const fs = require('fs');
const path = require('path');

console.log('Iniciando verificação de dependências do MCP...');

const packageJsonPath = path.resolve(__dirname, '../../package.json');
let missingDependencies = [];

try {
    if (!fs.existsSync(packageJsonPath)) {
        console.error('ERRO: O arquivo package.json não foi encontrado na raiz do projeto.');
        process.exit(1);
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const requiredDependencies = [
        'googleapis',
        '@google-cloud/local-auth'
    ];

    console.log('Verificando a presença das seguintes dependências:', requiredDependencies);

    requiredDependencies.forEach(dep => {
        if (!dependencies[dep]) {
            missingDependencies.push(dep);
        }
    });

    if (missingDependencies.length > 0) {
        console.error('\n--------------------------------------------------');
        console.error('FALHA NA VERIFICAÇÃO: Dependências do MCP ausentes no package.json:');
        missingDependencies.forEach(dep => console.log(`- ${dep}`));
        console.error('--------------------------------------------------');
        console.log('\nPor favor, instale as dependências ausentes para garantir o funcionamento do MCP.');
        process.exit(1);
    } else {
        console.log('\n--------------------------------------------------');
        console.log('SUCESSO: Todas as dependências do MCP foram encontradas no package.json.');
        console.log('--------------------------------------------------');
    }

} catch (error) {
    console.error('\n--------------------------------------------------');
    console.error('ERRO INESPERADO ao verificar as dependências:', error.message);
    console.error('--------------------------------------------------');
    process.exit(1);
}