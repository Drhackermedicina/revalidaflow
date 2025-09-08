# 🛠️ Scripts de Desenvolvimento

Este documento explica como usar os scripts de desenvolvimento criados para facilitar o trabalho local com o RevalidaFlow.

## 📋 Scripts Disponíveis

### `iniciar-dev.bat`
Inicia ambos frontend e backend simultaneamente em janelas separadas:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

**Uso:**
```cmd
scripts/iniciar-dev.bat
```

### `iniciar-backend-local.bat`
Inicia apenas o backend:
- Backend: `http://localhost:3000`

**Uso:**
```cmd
scripts/iniciar-backend-local.bat
```

### `menu-dev.bat`
Abre um menu interativo com opções de desenvolvimento:
1. Iniciar Frontend e Backend (ambos)
2. Iniciar apenas Frontend
3. Iniciar apenas Backend
4. Verificar status dos serviços
5. Parar todos os serviços
6. Sair

**Uso:**
```cmd
scripts/menu-dev.bat
```

### `verificar-status.bat`
Verifica se os serviços estão em execução e quais portas estão sendo usadas.

**Uso:**
```cmd
scripts/verificar-status.bat
```

### `parar-servicos.bat`
Encerra todos os processos Node.js em execução.

**Uso:**
```cmd
scripts/parar-servicos.bat
```

### `rodar-testes.bat`
Executa testes com opções interativas:
1. Todos os testes
2. Testes unitários
3. Teste de exemplo (básico)
4. Testes com cobertura
5. Modo watch (observar mudanças)
6. Teste específico (por nome)
7. Sair

**Uso:**
```cmd
scripts/rodar-testes.bat
```

## 🚀 Como Usar

1. **Para desenvolvimento completo:** Execute `scripts/iniciar-dev.bat` ou `scripts/menu-dev.bat` e escolha a opção 1
2. **Para trabalhar apenas no frontend:** Execute `npm run dev` ou use o menu
3. **Para trabalhar apenas no backend:** Execute `scripts/iniciar-backend-local.bat` ou use o menu
4. **Para verificar o que está rodando:** Execute `scripts/verificar-status.bat`
5. **Para parar tudo:** Execute `scripts/parar-servicos.bat`
6. **Para rodar testes:** Execute `scripts/rodar-testes.bat` e escolha o tipo de teste

## 🧪 Estrutura de Testes

O projeto inclui uma estrutura básica de testes:
- `tests/unit/` - Testes unitários
- `tests/integration/` - Testes de integração (vazio)
- `tests/e2e/` - Testes end-to-end (vazio)

Exemplo de teste disponível:
- `tests/unit/exemplo.test.js` - Teste básico que demonstra o funcionamento

## 📚 Documentação de Testes

Para informações detalhadas sobre como usar os testes, consulte:
- `docs/TESTES_GUIA_COMPLETO.md` - Guia completo de testes

## ⚠️ Observações

- Todos os scripts devem ser executados na raiz do projeto
- Certifique-se de que as dependências estão instaladas antes de usar os scripts
- Em caso de problemas, verifique se as portas 5173 e 3000 estão livres
- Os testes requerem que o Vitest esteja configurado (já está no projeto)
- Testes mais complexos com composables do Vue podem requerer configurações adicionais

