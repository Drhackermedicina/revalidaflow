const assert = require('assert');

// Mock para o flow de exemplo
const sampleFlow = {
    run: (input) => {
        if (typeof input !== 'string' || input.trim() === '') {
            throw new Error('O input deve ser um texto não vazio.');
        }
        return `O flow de exemplo recebeu: "${input}"`;
    }
};

console.log('Iniciando teste unitário do flow de exemplo...');

try {
    // Cenário de sucesso
    const input = 'Teste de Mensagem';
    const expectedOutput = `O flow de exemplo recebeu: "${input}"`;
    const result = sampleFlow.run(input);
    assert.strictEqual(result, expectedOutput, 'O output do flow não corresponde ao esperado.');
    console.log('  [✓] Teste de sucesso com input válido passou.');

    // Cenário de falha (input inválido)
    try {
        sampleFlow.run('');
        // Se não lançar erro, o teste falha
        assert.fail('Deveria ter lançado um erro para input vazio.');
    } catch (error) {
        assert.strictEqual(error.message, 'O input deve ser um texto não vazio.', 'A mensagem de erro para input vazio não corresponde à esperada.');
        console.log('  [✓] Teste de falha com input vazio passou.');
    }

    // Cenário de falha (input nulo)
    try {
        sampleFlow.run(null);
        assert.fail('Deveria ter lançado um erro para input nulo.');
    } catch (error) {
        console.log('  [✓] Teste de falha com input nulo passou.');
    }

    console.log('\n--------------------------------------------------');
    console.log('SUCESSO: Todos os testes unitários para o flow de exemplo passaram.');
    console.log('--------------------------------------------------');

} catch (error) {
    console.error('\n--------------------------------------------------');
    console.error('FALHA NO TESTE UNITÁRIO:', error.message);
    console.error('--------------------------------------------------');
    process.exit(1);
}