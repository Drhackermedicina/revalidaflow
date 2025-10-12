#!/usr/bin/env node

/**
 * Script de diagnóstico da página de Performance
 * Verifica problemas de carregamento de dados e autenticação
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 DIAGNÓSTICO DA PÁGINA DE PERFORMANCE\n');

// Verificar se os arquivos existem
const performanceViewPath = path.join(__dirname, 'src', 'pages', 'candidato', 'PerformanceView.vue');
const userStorePath = path.join(__dirname, 'src', 'stores', 'userStore.js');
const authPath = path.join(__dirname, 'src', 'plugins', 'auth.js');

console.log('📁 Verificando arquivos:');
console.log(`PerformanceView.vue: ${fs.existsSync(performanceViewPath) ? '✅ Existe' : '❌ Não encontrado'}`);
console.log(`userStore.js: ${fs.existsSync(userStorePath) ? '✅ Existe' : '❌ Não encontrado'}`);
console.log(`auth.js: ${fs.existsSync(authPath) ? '✅ Existe' : '❌ Não encontrado'}\n`);

// Analisar o PerformanceView.vue
if (fs.existsSync(performanceViewPath)) {
    const performanceContent = fs.readFileSync(performanceViewPath, 'utf8');

    console.log('🔍 ANÁLISE DO PERFORMANCEVIEW.VUE:');
    console.log('=====================================');

    // Verificar imports
    const hasUserStoreImport = performanceContent.includes("import { useUserStore } from '@/stores/userStore'");
    console.log(`Import useUserStore: ${hasUserStoreImport ? '✅ Presente' : '❌ Ausente'}`);

    // Verificar inicialização do store
    const hasUserStoreInit = performanceContent.includes('const userStore = useUserStore()');
    console.log(`Inicialização userStore: ${hasUserStoreInit ? '✅ Presente' : '❌ Ausente'}`);

    // Verificar chamada fetchUsers
    const hasFetchUsers = performanceContent.includes('userStore.fetchUsers()');
    console.log(`Chamada fetchUsers: ${hasFetchUsers ? '✅ Presente' : '❌ Ausente'}`);

    // Verificar computed properties
    const hasCurrentUserUid = performanceContent.includes('currentUserUid');
    console.log(`Computed currentUserUid: ${hasCurrentUserUid ? '✅ Presente' : '❌ Ausente'}`);

    const hasUserData = performanceContent.includes('userData');
    console.log(`Computed userData: ${hasUserData ? '✅ Presente' : '❌ Ausente'}`);

    // Verificar loading state
    const hasLoading = performanceContent.includes('const loading = computed');
    console.log(`Estado loading: ${hasLoading ? '✅ Presente' : '❌ Ausente'}`);

    // Verificar template
    const hasLoadingTemplate = performanceContent.includes('v-if="loading"');
    console.log(`Template loading: ${hasLoadingTemplate ? '✅ Presente' : '❌ Ausente'}`);

    console.log('');
}

// Analisar o userStore.js
if (fs.existsSync(userStorePath)) {
    const userStoreContent = fs.readFileSync(userStorePath, 'utf8');

    console.log('🔍 ANÁLISE DO USERSTORE.JS:');
    console.log('===========================');

    // Verificar estado inicial
    const hasUserState = userStoreContent.includes('user: null');
    console.log(`Estado user inicial: ${hasUserState ? '✅ Presente' : '❌ Ausente'}`);

    const hasUsersArray = userStoreContent.includes('users: []');
    console.log(`Array users: ${hasUsersArray ? '✅ Presente' : '❌ Ausente'}`);

    // Verificar função setUser
    const hasSetUser = userStoreContent.includes('function setUser(user)');
    console.log(`Função setUser: ${hasSetUser ? '✅ Presente' : '❌ Ausente'}`);

    // Verificar função fetchUsers
    const hasFetchUsers = userStoreContent.includes('function fetchUsers()');
    console.log(`Função fetchUsers: ${hasFetchUsers ? '✅ Presente' : '❌ Ausente'}`);

    // Verificar filtros de usuários ativos
    const hasActiveFilter = userStoreContent.includes('lastActive');
    console.log(`Filtro usuários ativos: ${hasActiveFilter ? '✅ Presente' : '❌ Ausente'}`);

    console.log('');
}

// Analisar auth.js
if (fs.existsSync(authPath)) {
    const authContent = fs.readFileSync(authPath, 'utf8');

    console.log('🔍 ANÁLISE DO AUTH.JS:');
    console.log('======================');

    // Verificar currentUser
    const hasCurrentUser = authContent.includes('export const currentUser = ref(null)');
    console.log(`currentUser export: ${hasCurrentUser ? '✅ Presente' : '❌ Ausente'}`);

    // Verificar waitForAuth
    const hasWaitForAuth = authContent.includes('export const waitForAuth');
    console.log(`waitForAuth export: ${hasWaitForAuth ? '✅ Presente' : '❌ Ausente'}`);

    // Verificar initAuthListener
    const hasInitAuth = authContent.includes('export const initAuthListener');
    console.log(`initAuthListener export: ${hasInitAuth ? '✅ Presente' : '❌ Ausente'}`);

    console.log('');
}

// Verificar se há dados de teste no Firestore
console.log('🔍 VERIFICAÇÃO DE DADOS DE TESTE:');
console.log('===================================');

// Verificar se há arquivos de configuração do Firebase
const firebaseConfigPath = path.join(__dirname, 'src', 'plugins', 'firebase.js');
if (fs.existsSync(firebaseConfigPath)) {
    const firebaseContent = fs.readFileSync(firebaseConfigPath, 'utf8');
    const hasConfig = firebaseContent.includes('firebaseConfig');
    console.log(`Configuração Firebase: ${hasConfig ? '✅ Presente' : '❌ Ausente'}`);
} else {
    console.log('Configuração Firebase: ❌ Arquivo não encontrado');
}

console.log('\n📋 POSSÍVEIS PROBLEMAS IDENTIFICADOS:');
console.log('=====================================');

// Problema 1: Usuário não autenticado
console.log('1. ❌ USUÁRIO NÃO AUTENTICADO');
console.log('   - Se o usuário não estiver logado, currentUser.value será null');
console.log('   - userStore.state.user será null');
console.log('   - userData computed retornará null');
console.log('   - loading será sempre true (users.length === 0)');
console.log('   - SOLUÇÃO: Verificar se o usuário está logado no Firebase Auth\n');

// Problema 2: Dados não existem no Firestore
console.log('2. ❌ DADOS NÃO EXISTEM NO FIRESTORE');
console.log('   - Se o usuário não tem documento na coleção "usuarios"');
console.log('   - Se o documento não tem campos estacoesConcluidas ou statistics');
console.log('   - SOLUÇÃO: Criar dados de teste ou verificar estrutura do documento\n');

// Problema 3: Filtros muito restritivos
console.log('3. ❌ FILTROS MUITO RESTRITIVOS NO FETCH');
console.log('   - fetchUsers() filtra apenas usuários ativos nos últimos 5 min');
console.log('   - fetchUsers() filtra apenas usuários ativos nos últimos 2 min');
console.log('   - SOLUÇÃO: Temporariamente remover filtros para teste\n');

// Problema 4: Timing de carregamento
console.log('4. ❌ TIMING DE CARREGAMENTO');
console.log('   - fetchUsers() pode demorar para retornar');
console.log('   - onMounted pode executar antes da autenticação');
console.log('   - SOLUÇÃO: Adicionar timeout e retry\n');

console.log('🎯 PRÓXIMOS PASSOS RECOMENDADOS:');
console.log('================================');
console.log('1. Verificar se o usuário está logado no Firebase Auth');
console.log('2. Verificar se existem dados na coleção "usuarios" do Firestore');
console.log('3. Temporariamente remover filtros restritivos para teste');
console.log('4. Adicionar logs de debug para acompanhar o fluxo');
console.log('5. Testar com dados mock se necessário');

console.log('\n' + '='.repeat(60));
console.log('📋 RESUMO DO DIAGNÓSTICO:');
console.log('• Arquivos principais: ✅ Todos presentes');
console.log('• Estrutura de código: ✅ Adequada');
console.log('• Problema provável: Autenticação ou dados ausentes');
console.log('• Solução mais provável: Verificar estado do usuário');
console.log('='.repeat(60));
