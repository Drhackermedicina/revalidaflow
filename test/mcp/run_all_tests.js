const { spawn } = require('child_process');
const path = require('path');

console.log('==================================================');
console.log('   INICIANDO SUÍTE DE TESTES DE CONFIGURAÇÃO MCP   ');
console.log('==================================================\n');

const tests = [
    'check_dependencies.js',
    'validate_config_format.js',
    'sample_flow_unit.test.js'
];

let failedTests = 0;
const results = [];

function runTest(testScript) {
    return new Promise((resolve) => {
        const testProcess = spawn('node', [path.join(__dirname, testScript)]);
        let output = '';

        testProcess.stdout.on('data', (data) => {
            output += data.toString();
            process.stdout.write(data);
        });

        testProcess.stderr.on('data', (data) => {
            output += data.toString();
            process.stderr.write(data);
        });

        testProcess.on('close', (code) => {
            const status = code === 0 ? 'SUCESSO' : 'FALHA';
            results.push({ script: testScript, status, output });
            if (code !== 0) {
                failedTests++;
            }
            resolve();
        });
    });
}

async function runAll() {
    for (const test of tests) {
        console.log(`\n--- Executando: ${test} ---\n`);
        await runTest(test);
    }

    console.log('\n==================================================');
    console.log('        RELATÓRIO FINAL DE CONFIGURAÇÃO         ');
    console.log('==================================================\n');

    results.forEach(result => {
        console.log(`- ${result.script}: ${result.status}`);
    });

    console.log('\n--------------------------------------------------');
    if (failedTests === 0) {
        console.log('STATUS GERAL: SUCESSO');
        console.log('A configuração básica do MCP parece estar correta.');
        console.log('Você pode prosseguir para adicionar sua API key e iniciar o servidor.');
    } else {
        console.log(`STATUS GERAL: FALHA (${failedTests} de ${tests.length} testes falharam)`);
        console.log('Por favor, revise os logs de erro acima para corrigir os problemas de configuração.');
    }
    console.log('--------------------------------------------------\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

runAll();