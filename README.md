# Projeto RevalidaFlow - Frontend

Este documento contém instruções para configurar e executar o frontend do projeto RevalidaFlow.

## 🚀 Como Iniciar o Desenvolvimento Local

Para iniciar o frontend em modo de desenvolvimento local e garantir que ele se conecte ao seu backend local, siga os passos abaixo:

1.  **Instalar Dependências:**
    Certifique-se de ter o Node.js e o npm (ou pnpm) instalados. Em seguida, instale as dependências do projeto:
    ```bash
    npm install
    # ou, se estiver usando pnpm:
    pnpm install
    ```

2.  **Iniciar o Frontend:**
    Utilize um dos seguintes comandos para iniciar o servidor de desenvolvimento:
    ```bash
    npm run dev
    # ou
    npm run dev:local
    ```
    Ambos os comandos iniciarão o frontend e o configurarão para se comunicar com o backend em `http://localhost:3000`.

    Após a inicialização, o frontend estará disponível em `http://localhost:5173` (ou outra porta, se configurado).

### ⚠️ Importante: Evite `npm run dev:cloud` para Desenvolvimento Local

O comando `npm run dev:cloud` é projetado para simular um ambiente de produção ou para testes específicos com o backend implantado no Cloud Run. **Não o utilize para desenvolvimento local**, pois ele tentará se conectar ao backend do Cloud Run, gerando custos desnecessários e comportamento inesperado.

## 📦 Build para Produção

Para gerar uma versão otimizada do frontend para produção:

```bash
npm run build
```

Os arquivos de produção serão gerados na pasta `dist/`.
