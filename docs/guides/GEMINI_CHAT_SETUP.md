# Configuração do Chat Gemini Integrado

## 📋 Pré-requisitos

1. **Obter API Key do Google Gemini**:
   - Acesse: https://aistudio.google.com/
   - Faça login com sua conta Google
   - Crie uma nova API Key ou use uma existente
   - Copie a chave gerada

## 🔧 Configuração

### 1. Configurar variáveis de ambiente

Edite o arquivo `.env.local` e substitua:

```env
VITE_GEMINI_API_KEY=sua_chave_api_aqui
```

Substitua `sua_chave_api_aqui` pela sua chave real do Gemini.

### 2. Verificar se a imagem do ícone existe

Certifique-se de que o arquivo existe em:
`/src/assets/images/svg/google-gemini-icon.webp`

Se não existir, você pode:
- Baixar um ícone do Gemini da web
- Usar um ícone alternativo
- Modificar o caminho no componente [`GeminiChat.vue`](src/components/GeminiChat.vue:47)

## 🚀 Como usar

1. **Acessar o chat**:
   - Clique no botão "Gemini IA" no header da aplicação
   - O chat abrirá em um modal em tela cheia

2. **Enviar mensagens**:
   - Digite sua pergunta no campo de texto
   - Pressione Enter ou clique no botão de enviar
   - Aguarde a resposta do Gemini

3. **Fechar o chat**:
   - Clique no botão "X" no canto superior direito
   - Ou pressione Esc

## 🧪 Testes

### Teste básico (sem API Key)
- O sistema usará as chaves de fallback
- Funcionalidade limitada mas operacional

### Teste completo (com API Key)
1. Configure a API Key válida no `.env.local`
2. Reinicie o servidor: `npm run dev`
3. Teste com perguntas simples:
   - "Olá, como você está?"
   - "O que é o Revalida?"
   - "Me explique sobre medicina interna"

## ⚠️ Solução de problemas

### Erro: "Gemini falhou após todas as tentativas"
- Verifique se a API Key está configurada corretamente
- Confirme se a chave tem permissões para o modelo Gemini 2.5 Flash

### Ícone não aparece
- Verifique o caminho da imagem em [`GeminiChat.vue`](src/components/GeminiChat.vue:47)
- Certifique-se de que o arquivo existe no diretório especificado

### Chat não abre
- Verifique se o componente [`DefaultLayoutWithVerticalNav.vue`](src/layouts/components/DefaultLayoutWithVerticalNav.vue) foi atualizado corretamente

## 🔒 Segurança

- As chaves API são gerenciadas via variáveis de ambiente
- Nunca commit chaves reais no repositório
- Use `.env.local` para desenvolvimento local
- Configure variáveis de ambiente no servidor de produção

## 📦 Dependências

O chat Gemini integrado utiliza:
- [`geminiService.js`](src/services/geminiService.js) - Serviço de integração com a API
- Componente Vue personalizado [`GeminiChat.vue`](src/components/GeminiChat.vue)
- Modelo Gemini 2.5 Flash via Google AI Studio

## 🎨 Personalização

Você pode personalizar:
- **Cores**: Modifique o gradiente no CSS do componente
- **Tamanho**: Ajuste as dimensões do modal no layout
- **Comportamento**: Modifique as configurações do modelo no serviço
