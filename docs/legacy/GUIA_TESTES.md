# 📚 Guia Completo de Testes - RevalidaFlow

Este guia ensina como usar e escrever testes para garantir a qualidade do código.

## 🎯 Por que Testar?

- ✅ **Previne bugs** antes de chegar aos usuários
- ✅ **Confiança** ao fazer mudanças no código
- ✅ **Documentação viva** de como o código funciona
- ✅ **Economia de tempo** a longo prazo

---

## 📁 Estrutura de Testes

```
tests/
├── unit/           # Testes unitários (Vitest) - testam funções isoladas
├── e2e/            # Testes end-to-end (Playwright) - testam fluxos completos
├── integration/    # Testes de integração - testam componentes juntos
└── setup.js        # Configuração global dos testes
```

---

## 🔧 Tipos de Testes

### 1️⃣ **Testes Unitários** (Vitest)
Testam funções e componentes isoladamente.

**Quando usar:**
- Testar uma função específica (ex: cálculo, formatação)
- Testar um composable (ex: useAuth, useSimulation)
- Testar lógica de negócio

**Exemplo:**
```javascript
// tests/unit/calculadora.test.js
import { describe, it, expect } from 'vitest'

describe('Calculadora', () => {
  it('deve somar dois números', () => {
    const resultado = 2 + 3
    expect(resultado).toBe(5)
  })
})
```

### 2️⃣ **Testes E2E (End-to-End)** (Playwright)
Testam fluxos completos no navegador real.

**Quando usar:**
- Testar fluxo de login completo
- Testar navegação entre páginas
- Testar interações do usuário (cliques, preenchimento de formulários)

**Exemplo:**
```javascript
// tests/e2e/login.spec.js
import { test, expect } from '@playwright/test'

test('deve fazer login com sucesso', async ({ page }) => {
  await page.goto('http://localhost:5173/login')
  await page.fill('input[name="email"]', 'teste@exemplo.com')
  await page.fill('input[name="password"]', 'senha123')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL(/dashboard/)
})
```

---

## 🚀 Como Rodar os Testes

### **Testes Unitários (Vitest)**

```powershell
# Rodar todos os testes unitários
npm test

# Rodar testes em modo watch (re-executa ao salvar arquivo)
npm test -- --watch

# Rodar um arquivo específico
npm test tests/unit/useAuth.test.js

# Rodar com interface gráfica (UI)
npm test -- --ui

# Ver cobertura de código (quanto % está testado)
npm test -- --coverage
```

### **Testes E2E (Playwright)**

```powershell
# Rodar todos os testes E2E
npx playwright test

# Rodar em modo UI (interface gráfica interativa)
npx playwright test --ui

# Rodar um arquivo específico
npx playwright test tests/e2e/login.spec.js

# Rodar com navegador visível (para ver o que está acontecendo)
npx playwright test --headed

# Rodar apenas em um navegador
npx playwright test --project=chromium

# Gerar e ver relatório
npx playwright show-report
```

### **Script Automatizado (Windows)**

Você já tem um script pronto:
```powershell
.\scripts\rodar-testes.bat
```

---

## ✍️ Como Escrever Testes

### **Teste Unitário - Passo a Passo**

**1. Criar arquivo de teste** em `tests/unit/`
```
tests/unit/minhaFuncao.test.js
```

**2. Estrutura básica (padrão AAA - Arrange, Act, Assert):**
```javascript
import { describe, it, expect } from 'vitest'
import { minhaFuncao } from '@/utils/minhaFuncao'

describe('Nome do que está testando', () => {
  it('deve fazer algo específico', () => {
    // Arrange (Preparar) - configurar dados de entrada
    const entrada = 'teste'

    // Act (Agir) - executar a função
    const resultado = minhaFuncao(entrada)

    // Assert (Afirmar) - verificar se resultado está correto
    expect(resultado).toBe('TESTE')
  })
})
```

**3. Matchers comuns (formas de verificar):**
```javascript
expect(valor).toBe(5)                    // Igualdade exata (===)
expect(valor).toEqual({ a: 1 })          // Igualdade de objetos/arrays
expect(valor).toBeTruthy()               // Verdadeiro
expect(valor).toBeFalsy()                // Falso
expect(array).toContain('item')          // Array contém item
expect(fn).toThrow()                     // Função lança erro
expect(valor).toBeGreaterThan(5)         // Maior que
expect(string).toMatch(/regex/)          // Match com regex
expect(valor).toBeNull()                 // É null
expect(valor).toBeUndefined()            // É undefined
```

### **Teste E2E - Passo a Passo**

**1. Criar arquivo de teste** em `tests/e2e/`
```
tests/e2e/meuFluxo.spec.js
```

**2. Estrutura básica:**
```javascript
import { test, expect } from '@playwright/test'

test('descrição do que está testando', async ({ page }) => {
  // 1. Navegar para página
  await page.goto('http://localhost:5173/pagina')

  // 2. Interagir com elementos
  await page.click('button.meu-botao')
  await page.fill('input[name="campo"]', 'valor')

  // 3. Verificar resultado
  await expect(page.locator('.resultado')).toHaveText('Sucesso')
})
```

**3. Ações comuns do Playwright:**
```javascript
// Navegação
await page.goto(url)                           // Ir para URL
await page.goBack()                            // Voltar
await page.goForward()                         // Avançar
await page.reload()                            // Recarregar

// Interações
await page.click(selector)                     // Clicar
await page.dblclick(selector)                  // Duplo clique
await page.fill(selector, 'texto')             // Preencher campo
await page.type(selector, 'texto')             // Digitar (mais lento)
await page.press(selector, 'Enter')            // Pressionar tecla
await page.check('input[type="checkbox"]')     // Marcar checkbox
await page.selectOption('select', 'valor')     // Selecionar option

// Esperas
await page.waitForSelector('.elemento')        // Esperar elemento aparecer
await page.waitForURL(/dashboard/)             // Esperar URL
await page.waitForTimeout(1000)                // Esperar tempo (evitar)

// Utilidades
await page.screenshot({ path: 'foto.png' })    // Tirar screenshot
const texto = await page.textContent('.el')    // Pegar texto
const valor = await page.inputValue('input')   // Pegar valor input
```

**4. Verificações comuns (assertions):**
```javascript
// Página
await expect(page).toHaveURL(/dashboard/)
await expect(page).toHaveTitle(/Título/)

// Elementos
await expect(page.locator('.elemento')).toBeVisible()
await expect(page.locator('.elemento')).toBeHidden()
await expect(page.locator('.elemento')).toHaveText('texto')
await expect(page.locator('.elemento')).toContainText('parte')
await expect(page.locator('.elemento')).toHaveAttribute('href', '/link')
await expect(page.locator('.elemento')).toHaveClass(/ativo/)
await expect(page.locator('.elemento')).toHaveCount(5)
```

---

## 🎨 Exemplos Práticos do RevalidaFlow

### **Exemplo 1: Testar Composable de Autenticação**

```javascript
// tests/unit/useAuth.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuth } from '@/composables/useAuth'

describe('useAuth - Autenticação', () => {
  beforeEach(() => {
    // Limpar mocks antes de cada teste
    vi.clearAllMocks()
  })

  it('deve fazer login com sucesso', async () => {
    const { login, isAuthenticated } = useAuth()

    await login('usuario@teste.com', 'senha123')

    expect(isAuthenticated.value).toBe(true)
  })

  it('deve fazer logout e limpar dados', async () => {
    const { logout, currentUser } = useAuth()

    await logout()

    expect(currentUser.value).toBeNull()
  })
})
```

### **Exemplo 2: Testar Fluxo de Simulação Completo**

```javascript
// tests/e2e/simulacao.spec.js
import { test, expect } from '@playwright/test'

test('candidato deve completar fluxo de simulação', async ({ page }) => {
  // 1. Fazer login
  await page.goto('http://localhost:5173/login')
  await page.fill('input[type="email"]', 'candidato@teste.com')
  await page.fill('input[type="password"]', 'senha123')
  await page.click('button[type="submit"]')

  // 2. Verificar que está no dashboard
  await expect(page).toHaveURL(/dashboard/)

  // 3. Navegar para estações
  await page.click('text=Estações Clínicas')

  // 4. Escolher primeira estação
  await page.click('.station-card >> nth=0')

  // 5. Iniciar simulação
  await page.click('button:has-text("Iniciar Simulação")')

  // 6. Verificar que simulação iniciou
  await expect(page.locator('.timer')).toBeVisible()
  await expect(page.locator('.simulation-active')).toBeVisible()
})
```

### **Exemplo 3: Testar Busca de Estações**

```javascript
// tests/e2e/busca-estacoes.spec.js
import { test, expect } from '@playwright/test'

test('deve filtrar estações por especialidade', async ({ page }) => {
  await page.goto('http://localhost:5173/stations')

  // Clicar no filtro de especialidade
  await page.click('button:has-text("Especialidade")')

  // Selecionar Cardiologia
  await page.click('text=Cardiologia')

  // Verificar que apenas estações de Cardiologia aparecem
  const cards = page.locator('.station-card')
  await expect(cards).toHaveCount(5)

  // Verificar que todas tem tag Cardiologia
  const tags = page.locator('.station-specialty')
  for (let i = 0; i < await tags.count(); i++) {
    await expect(tags.nth(i)).toHaveText('Cardiologia')
  }
})
```

### **Exemplo 4: Testar Upload de Estação (Admin)**

```javascript
// tests/e2e/admin-upload.spec.js
import { test, expect } from '@playwright/test'
import path from 'path'

test('admin deve fazer upload de estação JSON', async ({ page }) => {
  // Login como admin
  await page.goto('http://localhost:5173/login')
  await page.fill('[name="email"]', 'admin@revalida.com')
  await page.fill('[name="password"]', 'admin123')
  await page.click('button[type="submit"]')

  // Ir para página de upload
  await page.click('text=Admin')
  await page.click('text=Upload Estações')

  // Fazer upload do arquivo
  const filePath = path.join(__dirname, '../fixtures/estacao-teste.json')
  await page.setInputFiles('input[type="file"]', filePath)

  // Clicar em processar
  await page.click('button:has-text("Processar")')

  // Verificar sucesso
  await expect(page.locator('.success-message')).toBeVisible()
  await expect(page.locator('.success-message')).toContainText('Upload realizado')
})
```

---

## 🐛 Debugging de Testes

### **Vitest (Testes Unitários)**

```javascript
// Adicionar console.log para debug
it('teste com debug', () => {
  const valor = minhaFuncao()
  console.log('Valor retornado:', valor)
  expect(valor).toBe('esperado')
})

// Usar debugger (pausar no DevTools)
it('teste com breakpoint', () => {
  debugger // Código pausa aqui
  expect(valor).toBe(5)
})

// Rodar apenas um teste específico com .only
it.only('só roda este teste', () => {
  expect(1).toBe(1)
})

// Pular um teste com .skip
it.skip('pula este teste', () => {
  // Não será executado
})
```

### **Playwright (Testes E2E)**

```javascript
// Pausar execução para inspecionar
test('teste com pausa', async ({ page }) => {
  await page.goto('http://localhost:5173')
  await page.pause() // Abre Playwright Inspector
})

// Tirar screenshot em pontos específicos
test('teste com screenshots', async ({ page }) => {
  await page.goto('http://localhost:5173/login')
  await page.screenshot({ path: 'antes-login.png' })

  await page.fill('[name="email"]', 'teste@teste.com')
  await page.screenshot({ path: 'depois-preencher.png' })
})
```

**Comandos úteis para debug:**
```powershell
# Ver navegador enquanto roda (headed mode)
npx playwright test --headed

# Câmera lenta (slow motion)
npx playwright test --headed --slow-mo=1000

# Debug mode (com inspector)
npx playwright test --debug

# Rodar apenas um teste
npx playwright test -g "nome do teste"
```

---

## 📊 Boas Práticas

### ✅ **1. Nome descritivo e claro**
```javascript
// ❌ Ruim
it('teste 1', () => {})
it('funciona', () => {})

// ✅ Bom
it('deve retornar erro quando email é inválido', () => {})
it('deve esconder modal após salvar com sucesso', () => {})
```

### ✅ **2. Um conceito por teste**
```javascript
// ❌ Ruim - testa várias coisas em um teste
it('testa tudo do usuário', () => {
  expect(login()).toBe(true)
  expect(logout()).toBe(true)
  expect(register()).toBe(true)
  expect(updateProfile()).toBe(true)
})

// ✅ Bom - testes separados e focados
it('deve fazer login com credenciais válidas', () => {
  expect(login('user@test.com', 'pass')).toBe(true)
})

it('deve fazer logout e limpar sessão', () => {
  expect(logout()).toBe(true)
})

it('deve registrar novo usuário', () => {
  expect(register('novo@test.com')).toBe(true)
})
```

### ✅ **3. Usar beforeEach para setup comum**
```javascript
describe('Testes de Usuário', () => {
  let usuario

  beforeEach(() => {
    // Setup executado antes de CADA teste
    usuario = { nome: 'João', idade: 25, email: 'joao@teste.com' }
  })

  it('deve validar nome', () => {
    expect(usuario.nome).toBe('João')
  })

  it('deve validar email', () => {
    expect(usuario.email).toContain('@')
  })
})
```

### ✅ **4. Testar casos extremos (edge cases)**
```javascript
describe('Função processar texto', () => {
  it('deve processar texto normal', () => {
    expect(processar('Hello')).toBe('HELLO')
  })

  it('deve lidar com string vazia', () => {
    expect(processar('')).toBe('')
  })

  it('deve lidar com null', () => {
    expect(processar(null)).toBe(null)
  })

  it('deve lidar com texto muito longo', () => {
    const textoGrande = 'a'.repeat(10000)
    expect(processar(textoGrande).length).toBe(10000)
  })
})
```

### ✅ **5. Usar dados de teste realistas**
```javascript
// ❌ Ruim
const user = { nome: 'a', email: 'b' }

// ✅ Bom
const user = {
  nome: 'Dr. João Silva',
  email: 'joao.silva@hospital.com.br',
  especialidade: 'Cardiologia',
  crm: '12345-SP'
}
```

---

## 🎯 Quando Rodar Testes

- ✅ **Antes de commitar** código no Git
- ✅ **Antes de fazer deploy** para produção
- ✅ **Após adicionar nova funcionalidade**
- ✅ **Após corrigir um bug** (adicione teste que reproduz o bug primeiro!)
- ✅ **Durante desenvolvimento** em modo watch (`npm test -- --watch`)
- ✅ **Antes de fazer Pull Request**

---

## 🚀 Começando com Testes - Guia Rápido

### **Passo 1: Rodar testes existentes**
```powershell
# Ver se tudo está funcionando
npm test
```

### **Passo 2: Criar seu primeiro teste**
```powershell
# Criar arquivo
New-Item tests/unit/meuTeste.test.js
```

```javascript
// Conteúdo do arquivo
import { describe, it, expect } from 'vitest'

describe('Meu Primeiro Teste', () => {
  it('deve passar', () => {
    expect(1 + 1).toBe(2)
  })
})
```

### **Passo 3: Rodar em modo watch**
```powershell
npm test -- --watch
```

Agora edite o teste e veja ele rodar automaticamente! 🎉

---

## 🚨 Troubleshooting (Resolução de Problemas)

### **Problema: "Cannot find module"**
```powershell
# Solução: Reinstalar dependências
npm install
```

### **Problema: Playwright não encontra navegadores**
```powershell
# Solução: Instalar browsers do Playwright
npx playwright install
```

### **Problema: Testes E2E falham com timeout**
```javascript
// Solução: Aumentar timeout no teste
test('meu teste lento', async ({ page }) => {
  test.setTimeout(60000) // 60 segundos
  // resto do teste...
})
```

### **Problema: "Port 5173 already in use"**
```powershell
# Solução: Matar processo na porta 5173
taskkill /F /IM node.exe
# Ou usar o script
.\scripts\parar-servicos.bat
```

### **Problema: Testes unitários não encontram módulos @/**
```javascript
// Verificar se jsconfig.json está correto
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 📖 Recursos e Documentação

- 📚 [Vitest Docs](https://vitest.dev/) - Documentação oficial Vitest
- 📚 [Playwright Docs](https://playwright.dev/) - Documentação oficial Playwright
- 📚 [Vue Test Utils](https://test-utils.vuejs.org/) - Testar componentes Vue
- 📚 [Testing Library](https://testing-library.com/) - Boas práticas de testes

---

## 💡 Dicas Finais

1. **Comece simples** - Teste funções puras primeiro
2. **Teste o comportamento**, não a implementação
3. **Mantenha testes rápidos** - Testes lentos não são executados
4. **Leia mensagens de erro** - Elas geralmente te dizem o que está errado
5. **Não teste frameworks** - Confie que Vue/Vuetify funcionam, teste SEU código
6. **Use modo watch** durante desenvolvimento
7. **Busque 70-80% de cobertura**, não 100% (perde-se tempo demais)

---

**🎉 Parabéns! Agora você sabe usar testes no RevalidaFlow!**

**Próximos passos:**
1. Rode `npm test` para ver os testes existentes
2. Rode `npx playwright test --ui` para ver testes E2E
3. Crie um teste simples seguindo os exemplos
4. Rode em modo watch e veja a mágica acontecer! ✨
