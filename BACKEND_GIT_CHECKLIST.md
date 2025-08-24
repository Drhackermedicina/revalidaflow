# Checklist para Versionamento do backend/server.js

1. Verifique se está na pasta backend:
   ```sh
   cd backend
   ```

2. Confira o status do arquivo:
   ```sh
   git status
   ```

3. Se o arquivo aparecer como modificado ou não rastreado, adicione:
   ```sh
   git add server.js
   ```

4. Faça o commit:
   ```sh
   git commit -m "Correções no backend/server.js para teste de deploy automático"
   ```

5. Envie para o repositório remoto:
   ```sh
   git push
   ```

6. Volte à raiz do projeto e atualize o ponteiro do submódulo, se necessário:
   ```sh
   cd ..
   git add backend
   git commit -m "Atualiza ponteiro do submódulo backend"
   git push
   ```

---
Se algum comando falhar, verifique se o submódulo está corretamente inicializado e atualizado.
