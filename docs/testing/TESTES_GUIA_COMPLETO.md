# 🧪 GUIA COMPLETO DE TESTES - REVALIDAFLOW

Este documento fornece um guia completo sobre como usar, criar e executar testes no projeto RevalidaFlow.

## 📋 Visão Geral dos Testes

O projeto utiliza **Vitest** como framework de testes, que é compatível com a configuração de Vite e oferece execução rápida de testes.

### Tecnologias Utilizadas
- **Vitest** - Framework de testes
- **JSDOM** - Environment para testes DOM
- **Istanbul** - Coverage provider

### Estrutura de Testes
```
tests/
├── unit/        # Testes unitários
├── integration/ # Testes de integração
└── e2e/         # Testes end-to-end
```

## ▶️ Como Executar Testes

### Scripts Disponíveis

#### 1. Executar Todos os Testes
```cmd
npm test
# ou
scripts/rodar-testes.bat
# Escolher opção 1: "Todos os testes"
```

#### 2. Executar Testes Unitários
```cmd
npm test -- tests/unit
# ou
scripts/rodar-testes.bat
# Escolher opção 2: "Testes unitários"
```

#### 3. Executar Teste Específico
```cmd
npm test -- tests/unit/exemplo.test.js
# ou
scripts/rodar-testes.bat
# Escolher opção 6: "Teste específico (por nome)"
```

#### 4. Executar com Cobertura
```cmd
npm test -- --coverage
# ou
scripts/rodar-testes.bat
# Escolher opção 4: "Testes com cobertura"
```

#### 5. Modo Watch (Observar Mudanças)
```cmd
npm test -- --watch
# ou
scripts/rodar-testes.bat
# Escolher opção 5: "Modo watch (observar mudanças)"
```

## 🛠️ Configuração dos Testes

### Arquivo de Configuração Principal
**`vitest.config.js`**
```javascript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    alias: {
      '@': resolve(__dirname, './src'),
    },
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/dist/**',
        '**/docs/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
})
```

### Arquivo de Setup
**`tests/setup.js`**
```javascript
import { vi } from 'vitest'

// Mock global do Firebase
vi.mock('@/plugins/firebase', () => ({
  db: {},
  auth: {}
}))

// Mock global do currentUser
vi.mock('@/plugins/auth', () => ({
  currentUser: {
    value: null
  }
}))

// Mock do window e document para testes DOM
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock do localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
})
```

## 🧪 Criando Novos Testes

### Estrutura Básica de Teste
```javascript
import { describe, it, expect } from 'vitest'

describe('Nome do Conjunto de Testes', () => {
  it('deve fazer algo específico', () => {
    // Arrange (Preparação)
    const valor = 2 + 2
    
    // Act (Ação)
    const resultado = valor
    
    // Assert (Verificação)
    expect(resultado).toBe(4)
  })
})
```

### Testando Composables

#### Exemplo: Testando `useAuth.js`
```javascript
import { describe, it, expect } from 'vitest'
import { useAuth } from '../../src/composables/useAuth'

// Mock simples do currentUser
let mockCurrentUser = null

vi.mock('../../src/plugins/auth', () => ({
  get currentUser() {
    return {
      value: mockCurrentUser
    }
  }
}))

describe('useAuth', () => {
  beforeEach(() => {
    // Resetar o mock antes de cada teste
    mockCurrentUser = null
  })

  it('deve retornar informações do usuário logado', () => {
    mockCurrentUser = {
      uid: 'test-user-id',
      displayName: 'Test User',
      email: 'test@example.com'
    }
    
    const { user, userName } = useAuth()
    
    expect(user.value).toBeDefined()
    expect(user.value.uid).toBe('test-user-id')
    expect(user.value.displayName).toBe('Test User')
    expect(userName.value).toBe('Test User')
  })

  it('deve retornar "Candidato" quando usuário não está logado', () => {
    mockCurrentUser = null
    
    const { user, userName } = useAuth()
    expect(user.value).toBeNull()
    expect(userName.value).toBe('Candidato')
  })
})
```

### Testando Componentes Vue

#### Exemplo: Testando um Componente Simples
```javascript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MeuComponente from '../../src/components/MeuComponente.vue'

describe('MeuComponente', () => {
  it('deve renderizar corretamente', () => {
    const wrapper = mount(MeuComponente, {
      props: {
        titulo: 'Teste'
      }
    })
    
    expect(wrapper.text()).toContain('Teste')
  })

  it('deve emitir evento quando botão é clicado', async () => {
    const wrapper = mount(MeuComponente)
    const button = wrapper.find('button')
    
    await button.trigger('click')
    
    expect(wrapper.emitted()).toHaveProperty('meuEvento')
  })
})
```

## 📊 Relatórios de Cobertura

### Executando com Cobertura
```cmd
npm test -- --coverage
# ou
scripts/rodar-testes.bat
# Escolher opção 4: "Testes com cobertura"
```

### Relatórios Gerados
- **Texto:** Exibido no terminal
- **JSON:** `coverage/coverage-final.json`
- **HTML:** `coverage/index.html` (relatório navegável)

### Interpretando Cobertura
```
Statements   : 85% ( 85/100 )
Branches     : 70% ( 35/50 )
Functions    : 90% ( 18/20 )
Lines        : 85% ( 80/95 )
```

## 🎯 Boas Práticas de Testes

### 1. Estrutura AAA
```javascript
// Arrange - Preparação
const input = { name: 'John', age: 30 }

// Act - Ação
const result = processUser(input)

// Assert - Verificação
expect(result).toEqual({ name: 'John', age: 30, processed: true })
```

### 2. Nomes Descritivos
```javascript
// ❌ Ruim
it('deve funcionar', () => { ... })

// ✅ Bom
it('deve retornar usuário formatado quando dados válidos são fornecidos', () => { ... })
```

### 3. Testes Isolados
```javascript
// Cada teste deve ser independente
describe('useAdminAuth', () => {
  beforeEach(() => {
    // Resetar estado antes de cada teste
  })
  
  it('deve identificar admin', () => { ... })
  it('deve rejeitar não admin', () => { ... })
})
```

### 4. Mocks Adequados
```javascript
// Mock de dependências externas
vi.mock('@/services/api', () => ({
  getUser: vi.fn().mockResolvedValue({ name: 'John' })
}))
```

## 🔧 Debugando Testes

### Executar Teste Específico
```cmd
npm test -- tests/unit/useAuth.test.js
```

### Executar com Verbose
```cmd
npm test -- --verbose
```

### Debug no VS Code
1. Adicionar breakpoint no teste
2. Usar debugger do VS Code
3. Executar teste no modo debug

## 📈 Estratégia de Testes

### Pirâmide de Testes
```
        🧪 E2E Tests (10%)
       🔄 Integration Tests (20%)
      ✅ Unit Tests (70%)
```

### Prioridades
1. **Unitários:** Funções puras, composables, utilities
2. **Integração:** Componentes, serviços, stores
3. **E2E:** Fluxos completos da aplicação

## 🚀 Dicas Avançadas

### Testes Assíncronos
```javascript
it('deve buscar dados assíncronos', async () => {
  const mockData = { id: 1, name: 'Test' }
  vi.mocked(api.getData).mockResolvedValue(mockData)
  
  const result = await fetchData()
  
  expect(result).toEqual(mockData)
})
```

### Testes de Erro
```javascript
it('deve lidar com erro de API', async () => {
  vi.mocked(api.getData).mockRejectedValue(new Error('API Error'))
  
  await expect(fetchData()).rejects.toThrow('API Error')
})
```

### Snapshots
```javascript
it('deve renderizar componente corretamente', () => {
  const wrapper = mount(MeuComponente)
  expect(wrapper.html()).toMatchSnapshot()
})
```

## 📋 Comandos Úteis

### Verificação Rápida
```cmd
# Verificar sintaxe de todos os testes
find tests/ -name "*.test.js" -exec node -c {} \;

# Executar testes rápidos
npm test -- --run

# Limpar cache
npm test -- --clearCache
```

### Troubleshooting
```cmd
# Se testes falharem por imports
npm test -- --no-cache

# Se precisar reinstalar dependências
npm install @vue/test-utils vitest jsdom --save-dev
```

## 🎯 Próximos Passos

### Expandir Cobertura
1. Criar testes para todos os composables
2. Testar componentes principais
3. Adicionar testes de integração
4. Implementar testes E2E

### Melhorias Contínuas
1. Monitorar cobertura regularmente
2. Adicionar mais cenários de teste
3. Refatorar testes conforme código evolui
4. Integrar com CI/CD

Esta documentação fornece uma base sólida para trabalhar com testes no projeto RevalidaFlow!