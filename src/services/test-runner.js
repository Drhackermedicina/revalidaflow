/**
 * Executor de Testes de Performance para GeminiService
 * Script simples para executar testes básicos e coletar métricas
 */

import geminiService from './geminiService.js';

class PerformanceTestRunner {
  constructor() {
    this.results = {
      performance: [],
      fallback: [],
      stress: [],
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity,
        fallbackUsed: 0,
        cacheHits: 0,
        memoryUsage: []
      }
    };
  }

  /**
   * Executa todos os testes
   */
  async runAllTests() {
    console.log('🚀 Iniciando suite de testes de performance...\n');

    try {
      await this.runPerformanceTests();
      await this.runFallbackTests();
      await this.runStressTests();

      this.generateReport();
    } catch (error) {
      console.error('❌ Erro durante execução dos testes:', error);
    }
  }

  /**
   * Testes de Performance Básicos
   */
  async runPerformanceTests() {
    console.log('⚡ Executando testes de performance...');

    const testCases = [
      { name: 'Chat Pequeno', prompt: 'Olá, como você está?', type: 'chat' },
      { name: 'Chat Médio', prompt: 'A'.repeat(200), type: 'chat' },
      { name: 'Chat Grande', prompt: 'A'.repeat(500), type: 'chat' },
      { name: 'Edit Simples', prompt: 'Corrigir: Ola mundo', type: 'edit' },
      { name: 'Context Complexo', prompt: 'A'.repeat(300), type: 'context' }
    ];

    for (const testCase of testCases) {
      const startTime = performance.now();

      try {
        const result = await geminiService.makeRequest(testCase.prompt, '', 3, testCase.type);
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        this.results.performance.push({
          name: testCase.name,
          responseTime,
          success: true,
          type: testCase.type
        });

        this.updateMetrics(responseTime, true);

        console.log(`✅ ${testCase.name}: ${responseTime.toFixed(2)}ms`);

      } catch (error) {
        this.results.performance.push({
          name: testCase.name,
          responseTime: 0,
          success: false,
          error: error.message,
          type: testCase.type
        });

        this.updateMetrics(0, false);

        console.log(`❌ ${testCase.name}: ${error.message}`);
      }
    }

    console.log('✅ Testes de performance concluídos\n');
  }

  /**
   * Testes de Fallback
   */
  async runFallbackTests() {
    console.log('🔄 Executando testes de fallback...');

    // Teste 1: Cache offline
    console.log('📱 Testando cache offline...');
    try {
      // Popular cache
      geminiService.cache.set('teste_cache:contexto', 'Resposta em cache');

      const startTime = performance.now();
      const result = await geminiService.makeRequest('teste_cache', 'contexto', 3, 'chat');
      const endTime = performance.now();

      if (result === 'Resposta em cache') {
        this.results.fallback.push({
          name: 'Cache Offline',
          success: true,
          responseTime: endTime - startTime,
          type: 'cache'
        });
        this.results.metrics.cacheHits++;
        console.log(`✅ Cache offline: ${(endTime - startTime).toFixed(2)}ms`);
      }
    } catch (error) {
      console.log(`❌ Cache offline: ${error.message}`);
    }

    // Teste 2: Forçar erro para testar fallback
    console.log('🔧 Testando fallback de modelo...');
    try {
      const startTime = performance.now();
      const result = await geminiService.makeRequest('TESTE_FALLBACK', '', 5, 'chat');
      const endTime = performance.now();

      this.results.fallback.push({
        name: 'Fallback Modelo',
        success: true,
        responseTime: endTime - startTime,
        type: 'model_fallback'
      });

      if (result.includes('fallback') || result.includes('alternativo')) {
        this.results.metrics.fallbackUsed++;
      }

      console.log(`✅ Fallback modelo: ${(endTime - startTime).toFixed(2)}ms`);
    } catch (error) {
      console.log(`❌ Fallback modelo: ${error.message}`);
    }

    console.log('✅ Testes de fallback concluídos\n');
  }

  /**
   * Testes de Estresse
   */
  async runStressTests() {
    console.log('💥 Executando testes de estresse...');

    // Teste 1: Requisições simultâneas
    console.log('⚡ Testando 10 requisições simultâneas...');
    const concurrentRequests = 10;
    const concurrentPromises = Array(concurrentRequests).fill().map((_, i) =>
      geminiService.makeRequest(`Simultâneo ${i}`, '', 3, 'chat').catch(() => null)
    );

    const startConcurrent = performance.now();
    const concurrentResults = await Promise.allSettled(concurrentPromises);
    const endConcurrent = performance.now();

    const concurrentSuccess = concurrentResults.filter(r => r.status === 'fulfilled').length;
    const concurrentTime = endConcurrent - startConcurrent;

    this.results.stress.push({
      name: 'Simultâneas',
      totalRequests: concurrentRequests,
      successfulRequests: concurrentSuccess,
      totalTime: concurrentTime,
      throughput: concurrentRequests / (concurrentTime / 1000)
    });

    console.log(`✅ Simultâneas: ${concurrentSuccess}/${concurrentRequests} em ${concurrentTime.toFixed(2)}ms`);

    // Teste 2: Requisições sequenciais
    console.log('🔄 Testando 5 requisições sequenciais...');
    const sequentialRequests = 5;
    const sequentialTimes = [];

    for (let i = 0; i < sequentialRequests; i++) {
      const startTime = performance.now();
      try {
        await geminiService.makeRequest(`Sequencial ${i}`, '', 3, 'chat');
        const endTime = performance.now();
        sequentialTimes.push(endTime - startTime);
      } catch (error) {
        sequentialTimes.push(0);
      }
    }

    const avgSequential = sequentialTimes.reduce((a, b) => a + b, 0) / sequentialTimes.length;

    this.results.stress.push({
      name: 'Sequenciais',
      totalRequests: sequentialRequests,
      averageTime: avgSequential,
      times: sequentialTimes
    });

    console.log(`✅ Sequenciais: média ${avgSequential.toFixed(2)}ms`);

    console.log('✅ Testes de estresse concluídos\n');
  }

  /**
   * Atualiza métricas globais
   */
  updateMetrics(responseTime, success) {
    this.results.metrics.totalRequests++;

    if (success) {
      this.results.metrics.successfulRequests++;
      this.results.metrics.averageResponseTime =
        (this.results.metrics.averageResponseTime * (this.results.metrics.successfulRequests - 1) + responseTime) /
        this.results.metrics.successfulRequests;

      this.results.metrics.maxResponseTime = Math.max(this.results.metrics.maxResponseTime, responseTime);
      this.results.metrics.minResponseTime = Math.min(this.results.metrics.minResponseTime, responseTime);
    } else {
      this.results.metrics.failedRequests++;
    }

    // Monitorar uso de memória
    if (performance.memory) {
      this.results.metrics.memoryUsage.push({
        time: Date.now(),
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize
      });
    }
  }

  /**
   * Gera relatório final
   */
  generateReport() {
    console.log('📊 ===== RELATÓRIO DE PERFORMANCE =====\n');

    // Métricas gerais
    const metrics = this.results.metrics;
    console.log('📈 MÉTRICAS GERAIS:');
    console.log(`   Total de Requisições: ${metrics.totalRequests}`);
    console.log(`   Requisições Bem-sucedidas: ${metrics.successfulRequests}`);
    console.log(`   Requisições Falhadas: ${metrics.failedRequests}`);
    console.log(`   Taxa de Sucesso: ${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)}%`);
    console.log(`   Tempo Médio de Resposta: ${metrics.averageResponseTime.toFixed(2)}ms`);
    console.log(`   Tempo Máximo de Resposta: ${metrics.maxResponseTime.toFixed(2)}ms`);
    console.log(`   Tempo Mínimo de Resposta: ${metrics.minResponseTime === Infinity ? 'N/A' : metrics.minResponseTime.toFixed(2) + 'ms'}`);
    console.log(`   Fallbacks Utilizados: ${metrics.fallbackUsed}`);
    console.log(`   Cache Hits: ${metrics.cacheHits}`);

    // Uso de memória
    if (metrics.memoryUsage.length > 0) {
      const lastMemory = metrics.memoryUsage[metrics.memoryUsage.length - 1];
      console.log(`   Uso Final de Memória: ${(lastMemory.used / 1024 / 1024).toFixed(2)} MB`);
    }

    console.log('\n⚡ PERFORMANCE POR TIPO:');
    const performanceByType = {};
    this.results.performance.forEach(test => {
      if (!performanceByType[test.type]) {
        performanceByType[test.type] = { total: 0, count: 0, success: 0 };
      }
      performanceByType[test.type].total += test.responseTime;
      performanceByType[test.type].count++;
      if (test.success) performanceByType[test.type].success++;
    });

    Object.entries(performanceByType).forEach(([type, data]) => {
      const avgTime = data.total / data.count;
      const successRate = (data.success / data.count) * 100;
      console.log(`   ${type.toUpperCase()}: ${avgTime.toFixed(2)}ms médio, ${successRate.toFixed(1)}% sucesso`);
    });

    console.log('\n💥 ESTRESSE:');
    this.results.stress.forEach(test => {
      if (test.name === 'Simultâneas') {
        console.log(`   Simultâneas: ${test.throughput.toFixed(2)} req/s, ${test.totalTime.toFixed(2)}ms total`);
      } else if (test.name === 'Sequenciais') {
        console.log(`   Sequenciais: ${test.averageTime.toFixed(2)}ms médio`);
      }
    });

    console.log('\n🔄 FALLBACK:');
    this.results.fallback.forEach(test => {
      console.log(`   ${test.name}: ${test.success ? '✅' : '❌'} ${test.responseTime ? test.responseTime.toFixed(2) + 'ms' : ''}`);
    });

    // Identificar gargalos
    console.log('\n🚨 GARGALOS IDENTIFICADOS:');
    if (metrics.averageResponseTime > 2000) {
      console.log('   ⚠️  Tempo de resposta médio alto (>2s)');
    }
    if ((metrics.successfulRequests / metrics.totalRequests) < 0.8) {
      console.log('   ⚠️  Taxa de sucesso baixa (<80%)');
    }
    if (metrics.fallbackUsed > metrics.totalRequests * 0.1) {
      console.log('   ⚠️  Alto uso de fallback (>10% das requisições)');
    }
    if (metrics.memoryUsage.length > 0) {
      const memoryIncrease = metrics.memoryUsage[metrics.memoryUsage.length - 1].used - metrics.memoryUsage[0].used;
      if (memoryIncrease > 10 * 1024 * 1024) { // 10MB
        console.log('   ⚠️  Possível vazamento de memória (>10MB)');
      }
    }

    console.log('\n✅ Relatório concluído!');
  }
}

// Executar testes se script for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new PerformanceTestRunner();
  runner.runAllTests().catch(console.error);
}

export default PerformanceTestRunner;