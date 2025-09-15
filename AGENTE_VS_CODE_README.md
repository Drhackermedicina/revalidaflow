# Sistema de Usuário Especial para Agentes VS Code

Este documento explica como configurar e usar o sistema de usuário especial que permite aos agentes do VS Code acessarem todas as páginas do aplicativo sem autenticação tradicional.

## 📋 Visão Geral

O sistema implementa um usuário especial (`agent@revalidafacil.com`) que tem acesso irrestrito a todas as funcionalidades do aplicativo, incluindo:

- ✅ Acesso completo a todas as páginas
- ✅ Permissões administrativas
- ✅ Leitura e escrita em todas as coleções do Firestore
- ✅ Funcionalidades de criação, edição e exclusão
- ✅ Logs administrativos e configurações do sistema

## 🔧 Configuração

### 1. Criar Usuário no Firebase Authentication

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá para **Authentication** > **Users**
4. Clique em **Add user**
5. Preencha os dados:
   - **Email**: `agent@revalidafacil.com`
   - **Password**: Defina uma senha segura (guarde para uso nos testes)
6. Clique em **Add user**
7. **IMPORTANTE**: Anote o **UID** do usuário criado - você precisará dele nas próximas etapas

### 2. Atualizar Regras do Firestore

As regras do Firestore já foram atualizadas para incluir o usuário especial. Você só precisa substituir o placeholder pelo UID real:

1. Abra o arquivo `firestore.rules`
2. Substitua `AGENT_UID_PLACEHOLDER` pelo UID real do usuário criado
3. Execute o comando para atualizar as regras:

```bash
firebase deploy --only firestore:rules
```

### 3. Atualizar Código Frontend

O código frontend já foi atualizado para detectar o usuário especial. Você só precisa substituir o placeholder:

1. Abra o arquivo `src/composables/useAdminAuth.js`
2. Substitua `AGENT_UID_PLACEHOLDER` pelo UID real do usuário criado

### 4. Configurar Variáveis de Ambiente para Testes

Para os testes automatizados funcionarem, configure a senha do usuário agente:

```bash
# No arquivo .env ou .env.local
AGENT_PASSWORD=sua_senha_aqui
```

## 🧪 Usando com Playwright

### Configuração Básica

Os arquivos de teste já estão criados em `tests/e2e/`:

- `agent-auth.js` - Utilitários de autenticação
- `agent-access.spec.js` - Exemplos de testes

### Executando Testes

```bash
# Executar todos os testes do agente
npx playwright test tests/e2e/agent-access.spec.js

# Executar testes em modo headless
npx playwright test tests/e2e/agent-access.spec.js --headed

# Executar testes em um navegador específico
npx playwright test tests/e2e/agent-access.spec.js --browser=chromium
```

### Exemplo de Uso em Testes Personalizados

```javascript
import { test, expect } from '@playwright/test';
import { setupAgentSession, testAgentPageAccess } from './agent-auth.js';

test('meu teste personalizado', async ({ page }) => {
  // Configurar sessão do agente
  await setupAgentSession(page);

  // Testar acesso a uma página específica
  await testAgentPageAccess(page, '/minha-pagina-admin');

  // Seu código de teste aqui
  // ...
});
```

## 🔐 Funcionalidades do Usuário Especial

### Acesso Completo
- ✅ Todas as páginas do aplicativo
- ✅ Funcionalidades administrativas
- ✅ Criação, edição e exclusão de conteúdo
- ✅ Acesso a logs e configurações do sistema

### Regras do Firestore
O usuário especial tem acesso irrestrito a:
- `estacoes_clinicas` - Leitura e escrita
- `questoes` - Criação, edição, exclusão
- `admin_logs` - Acesso completo
- `system_config` - Acesso completo
- Todas as outras coleções

### Detecção no Frontend
O sistema detecta o usuário especial por:
- Email: `agent@revalidafacil.com`
- UID específico (configurado)
- Função `isAgentUser()` retorna `true`

## 🚀 Implantação

### Checklist de Implantação

- [x] Criar usuário no Firebase Authentication
- [x] Atualizar `AGENT_UID_PLACEHOLDER` em `firestore.rules`
- [x] Atualizar `AGENT_UID_PLACEHOLDER` em `src/composables/useAdminAuth.js`
- [x] Configurar `AGENT_PASSWORD` no ambiente de testes
- [ ] Executar `firebase deploy --only firestore:rules`
- [ ] Testar acesso com o usuário agente

### Verificação

Para verificar se tudo está funcionando:

1. Faça login com `agent@revalidafacil.com`
2. Verifique se consegue acessar `/admin`
3. Teste criação/edição de estações clínicas
4. Execute os testes Playwright

## 🐛 Troubleshooting

### Problemas Comuns

**Erro: "Usuário não tem permissão"**
- Verifique se o UID foi atualizado corretamente em `firestore.rules`
- Confirme se as regras foram implantadas: `firebase deploy --only firestore:rules`

**Erro: "Página não carrega"**
- Verifique se o usuário está logado corretamente
- Confirme se o email está exatamente `agent@revalidafacil.com`

**Testes falham**
- Verifique se `AGENT_PASSWORD` está configurada
- Confirme se o servidor de desenvolvimento está rodando
- Verifique se as URLs nos testes estão corretas

### Logs Úteis

Para debug, verifique:
- Console do navegador (F12)
- Logs do Firebase Authentication
- Logs do Firestore
- Output dos testes Playwright

## 📚 Referências

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Playwright Testing](https://playwright.dev/)

## 🤝 Suporte

Para dúvidas ou problemas:
1. Verifique este documento
2. Consulte os logs de erro
3. Teste passo a passo a configuração
4. Verifique se todas as substituições de placeholder foram feitas