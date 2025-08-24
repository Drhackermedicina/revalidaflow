# Guia Rápido de Comandos Git para o Projeto

Este documento explica como utilizar o Git corretamente no projeto, considerando submódulos e o repositório principal.

## Repositório Principal

Use estes comandos na raiz do projeto para versionar arquivos fora dos submódulos:

```sh
git add <arquivo>
git commit -m "Mensagem do commit"
git push
```

## Submódulo backend

Para arquivos dentro de `backend/`, execute os comandos diretamente na pasta do submódulo:

```sh
cd backend
git add server.js
git commit -m "Correções no backend/server.js para teste de deploy automático"
git push
```

**Importante:**  
- O submódulo possui seu próprio histórico e repositório remoto.
- Após o push no submódulo, volte à raiz e faça commit/push do ponteiro do submódulo se necessário:

```sh
cd ..
git add backend
git commit -m "Atualiza ponteiro do submódulo backend"
git push
```

## Dicas

- Sempre verifique em qual pasta está antes de executar comandos git.
- Para listar submódulos: `git submodule status`
- Para atualizar submódulos: `git submodule update --remote`

---
